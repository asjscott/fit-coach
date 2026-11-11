import {
  BuiltInEquipment,
  type Assessment,
  type Exercise,
  type Goal,
  type InjuryTag,
  type Muscle,
  type PlannedExercise,
  type PlannedWorkout,
  type SetTarget,
  type WeightUnit,
  type WorkingLevel,
} from "@fit/shared";
import { withAlternatives, type Candidate } from "./alternative-exercises";
import { exerciseBySlug, EXERCISES } from "./data/exercises";
import {
  availableLoadsKg,
  builtInEquipment,
  isAvailable,
  isSafeFor,
  loadAtOrBelowKg,
  matchesBuiltIn,
  type ProfileWithLoads,
} from "./equipment";
import { muscleFatigue, tiredMuscles, type FatigueWorkout } from "./fatigue";
import { isJump, JUMP_SETS, jumpCandidates, jumpsForWorkout } from "./jumps";
import { planReasons } from "./plan-reasons";
import { scoreExercise, type WeekSoFar } from "./plan-score";
import { RECOVERY_WORKOUT, trainingWorkouts } from "./recovery-workout";
import {
  addCredits,
  creditsPerSet,
  mondayBefore,
  mondayOf,
  weekLedger,
  workoutsInWeek,
  type LedgerWorkout,
  type MuscleCredits,
} from "./week-ledger";
import {
  fillOrder,
  MAX_SETS_PER_EXERCISE,
  MIN_WORKOUTS_PER_MUSCLE,
  MUSCLE_CAP_PER_WORKOUT,
  SETS_PER_PICK,
  WEEKLY_CAP,
  weeklyBudget,
  type WeeklyBudget,
} from "./weekly-budget";
import { asDone } from "./working-level-sections";
import { seedWorkingLevels } from "./working-levels";
import { secondsForSets } from "./workout-length";

// Always the Long version: the day's Workout cuts it to length (daysWorkout)
const WORKOUT_SECONDS = secondsForSets("long");
// The part of power training that survives 8-rep Sets
const ATHLETIC_CUE = "Lift as fast as you can on the way up";

// Everything a plan depends on, so the same inputs give the same plan
export type PlanWorkoutInput = {
  // Finished Workouts, at least all of this week's and last week's; each week keeps its own and counts each once
  workouts: readonly (LedgerWorkout & FatigueWorkout)[];
  now: Date;
  timeZone: string;
  equipmentProfile: ProfileWithLoads;
  injuries: InjuryTag[];
  // The stored ones; any others are worked out from the Assessment
  workingLevels: readonly WorkingLevel[];
  assessment: Pick<Assessment, "bodyWeightKg" | "patterns">;
  goal: Goal;
  daysPerWeek: number;
  // The user's unit, which Full gym's loads follow
  unit: WeightUnit;
  // The one-time "Include jumps" switch on the Profile, off by default (#105)
  includeJumps?: boolean;
  // The Block's deload week (weekOfBlock): the same Sets, lighter (deloaded), and jumps at half their contacts
  deloadWeek?: boolean;
};

// What the planner decides; the API gives it an id and a status when it saves it. heldBack is the tired Muscles
// whose Exercises the recovery filter left out of the plan
export type WorkoutPlan = Pick<PlannedWorkout, "weekStart" | "plannedExercises" | "cue"> &
  Required<Pick<PlannedWorkout, "reasons">> & { heldBack: Muscle[] };

// A Set's target from a stored Working Level, or null when it can't be prescribed on this equipment
function targetFrom(
  workingLevel: WorkingLevel,
  exercise: Exercise,
  equipmentProfile: ProfileWithLoads,
): SetTarget | null {
  const level = asDone(workingLevel, exercise, equipmentProfile);
  switch (level?.unit) {
    case undefined:
      return null;
    case "kg":
      return { unit: "kg", kg: level.kg, reps: level.reps };
    case "reps":
      return { unit: "reps", reps: level.reps };
    case "seconds":
      return { unit: "seconds", seconds: level.seconds };
    case "band":
      return { unit: "band", level: level.level, reps: level.reps };
  }
}

// The deload week's lighter work (ADR 0007, stories 64–66), with the same Sets: loads this much lighter, rounded down
// to a Load Step, and reps and seconds targets at DELOAD_TARGET, rounded down to a whole rep (at least 5) or to 5
// seconds (at least 15), but never above the usual target. Jumps halve their contacts instead (jumps.ts)
const DELOAD_LOAD = 0.9;
const DELOAD_TARGET = 0.7;
const DELOAD_MIN_REPS = 5;
const DELOAD_SECONDS_STEP = 5;
const DELOAD_MIN_SECONDS = 15;

const deloadedReps = (reps: number) => Math.min(reps, Math.max(DELOAD_MIN_REPS, Math.floor(reps * DELOAD_TARGET)));
const deloadedSeconds = (seconds: number) =>
  Math.min(
    seconds,
    Math.max(DELOAD_MIN_SECONDS, Math.floor((seconds * DELOAD_TARGET) / DELOAD_SECONDS_STEP) * DELOAD_SECONDS_STEP),
  );

// The load at or below 10% lighter that the profile has, or its lightest when none is that light; to 0.5 kg below it
// when the profile's loads aren't known
function deloadedKg(kg: number, exercise: Exercise, equipmentProfile: ProfileWithLoads) {
  const lighter = kg * DELOAD_LOAD;
  const loads = availableLoadsKg(exercise, equipmentProfile);
  if (!loads.length) return Math.floor(lighter * 2) / 2;
  return loads[0]! > lighter ? loads[0]! : loadAtOrBelowKg(lighter, loads);
}

function deloaded(target: SetTarget, exercise: Exercise, equipmentProfile: ProfileWithLoads): SetTarget {
  switch (target.unit) {
    case "kg":
      return { ...target, kg: deloadedKg(target.kg, exercise, equipmentProfile) };
    case "reps":
    case "band":
      return { ...target, reps: deloadedReps(target.reps) };
    case "seconds":
      return { ...target, seconds: deloadedSeconds(target.seconds) };
  }
}

// Each Exercise's Working Level on this equipment: the stored one, unless it's for a way of doing the Exercise this
// profile doesn't have. Otherwise it's worked out as the Assessment seeded them, which covers a profile added since
function workingLevelsFor({ workingLevels, assessment, equipmentProfile }: PlanWorkoutInput) {
  const referenceStrengths = Object.fromEntries(
    Object.entries(assessment.patterns).map(([pattern, { referenceStrength }]) => [pattern, referenceStrength]),
  );
  const seeded = seedWorkingLevels({
    referenceStrengths,
    bodyWeightKg: assessment.bodyWeightKg,
    equipmentProfiles: [equipmentProfile],
  });
  const levels = new Map(seeded.map((level) => [level.slug, level]));
  for (const stored of workingLevels) {
    const seed = levels.get(stored.slug);
    if (!seed || seed.unit === stored.unit) levels.set(stored.slug, stored);
  }
  return levels;
}

// An Exercise whose Working Level has outgrown it, such as a bodyweight seed above 15 reps, gives way to its
// progression if the user can do that, and otherwise stays at the top of what it prescribes
function withoutOutgrown(candidates: readonly Candidate[]) {
  const slugs = new Set(candidates.map(({ exercise }) => exercise.slug));
  return candidates.filter(
    ({ exercise: { progression }, outgrown }) => !(outgrown && progression && slugs.has(progression)),
  );
}

// Variety across the week, not within a Workout. It gives way when it would leave nothing, since a user who has run
// out of Exercises by training more than planned still gets a Workout
function withinVarietyCap(candidates: readonly Candidate[], thisWeek: readonly LedgerWorkout[], daysPerWeek: number) {
  const cap = Math.ceil(daysPerWeek / 2);
  const workoutsWith = (slug: string) =>
    thisWeek.filter(({ workoutExercises }) => workoutExercises.some((logged) => logged.slug === slug)).length;
  const varied = candidates.filter(({ exercise }) => workoutsWith(exercise.slug) < cap);
  return varied.length ? varied : candidates;
}

// Longest Sets first, as those are the bigger lifts, so a tie never falls to where an Exercise sits in the library
const byTieOrder = ({ exercise: a }: Candidate, { exercise: b }: Candidate) =>
  b.secondsPerSet - a.secondsPerSet || a.slug.localeCompare(b.slug);

// What the equipment and injuries allow, with a target to prescribe. Never a Recovery Exercise, nor a jump, which
// only the jump rule gives (jumps.ts)
function possibleExercises(input: PlanWorkoutInput): Candidate[] {
  const { equipmentProfile, injuries } = input;
  const levels = workingLevelsFor(input);
  const possible = EXERCISES.flatMap((exercise) => {
    const level = levels.get(exercise.slug);
    if (
      !level ||
      exercise.recovery ||
      isJump(exercise) ||
      !isAvailable(exercise, equipmentProfile) ||
      !isSafeFor(exercise, injuries)
    )
      return [];
    const target = targetFrom(level, exercise, equipmentProfile);
    if (!target) return [];
    return [
      {
        exercise,
        target: input.deloadWeek ? deloaded(target, exercise, equipmentProfile) : target,
        outgrown: level.outgrown,
      },
    ];
  });
  return withChanges(possible, levels);
}

// When a level moved by a Workout, as a time to compare; -Infinity for one no Workout has moved
const movedAt = (level: WorkingLevel | undefined) => (level?.movedBy ? Date.parse(level.movedBy.startedAt) : -Infinity);

// Why each possible Exercise's Working Level changed (#132), as its Planned Exercise shows it. An Exercise progression
// outgrew is worded by what the plan does with it: a hold at the top when its harder variant can't be given, and
// otherwise, on the harder variant, which Exercise it takes over from, until that variant is done itself
function withChanges(possible: readonly Candidate[], levels: ReadonlyMap<string, WorkingLevel>): Candidate[] {
  const slugs = new Set(possible.map(({ exercise }) => exercise.slug));
  const outgrownBy = (slug: string) => levels.get(slug)?.change?.code === "outgrown";
  return possible.map((candidate) => {
    const { exercise } = candidate;
    const level = levels.get(exercise.slug);
    const from = possible.find(
      ({ exercise: easier }) =>
        easier.progression === exercise.slug &&
        outgrownBy(easier.slug) &&
        movedAt(level) < movedAt(levels.get(easier.slug)),
    );
    if (from) return { ...candidate, change: { code: "harder-variant", from: from.exercise.slug } };
    const change = level?.change;
    if (!change) return candidate;
    if (change.code !== "outgrown") return { ...candidate, change };
    const replaced = exercise.progression && slugs.has(exercise.progression);
    return replaced ? candidate : { ...candidate, change: { code: "held-at-top" } };
  });
}

// The possible Exercises the guards let the Coach pick. Their order settles a tie: last week's first, so that the same
// Exercises carry on from week to week, and otherwise byTieOrder
function pickableExercises(
  possible: readonly Candidate[],
  thisWeek: readonly LedgerWorkout[],
  lastWeek: readonly LedgerWorkout[],
  daysPerWeek: number,
): Candidate[] {
  const varied = [...withinVarietyCap(withoutOutgrown(possible), thisWeek, daysPerWeek)].sort(byTieOrder);
  const trainedLastWeek = new Set(lastWeek.flatMap(({ workoutExercises }) => workoutExercises.map(({ slug }) => slug)));
  const isLastWeeks = ({ exercise }: Candidate) => trainedLastWeek.has(exercise.slug);
  return [...varied.filter(isLastWeeks), ...varied.filter((candidate) => !isLastWeeks(candidate))];
}

// Each built-in choice the primary doesn't already match. It goes in the saved plan, as the phone may have no signal
// when the user chooses. Jumps are there too, so that a jump stays itself or gives way to another jump
function builtInCandidates(
  input: PlanWorkoutInput,
  thisWeek: readonly LedgerWorkout[],
  lastWeek: readonly LedgerWorkout[],
) {
  const choices = BuiltInEquipment.options.filter((choice) => !matchesBuiltIn(input.equipmentProfile, choice));
  return Object.fromEntries(
    choices.map((choice) => {
      const onChoice = { ...input, equipmentProfile: builtInEquipment(choice, input.unit) };
      const possible = possibleExercises(onChoice);
      const jumps = jumpCandidates(onChoice);
      const pickable = pickableExercises(possible, thisWeek, lastWeek, input.daysPerWeek);
      return [choice, { possible: [...jumps, ...possible], pickable: [...jumps, ...pickable] }];
    }),
  );
}

// The most credited Sets a Muscle should take from this Workout: half its budget while another Workout is left this
// week, so that it's spread, and never past the cap
function muscleLimits(budget: WeeklyBudget, workoutsLeft: number) {
  const spreadOver = Math.min(workoutsLeft, MIN_WORKOUTS_PER_MUSCLE);
  return (muscle: Muscle) => Math.min(MUSCLE_CAP_PER_WORKOUT, Math.ceil((budget[muscle] ?? Infinity) / spreadOver));
}

// The plan so far. The Map keeps pick order, which is the plan's priority order
type Draft = {
  sets: Map<Candidate, number>;
  fourthSetAfter: Map<Candidate, number>;
  credits: MuscleCredits;
  secondsLeft: number;
};

const setsToAdd = ({ sets }: Draft, candidate: Candidate) =>
  sets.has(candidate) ? MAX_SETS_PER_EXERCISE - sets.get(candidate)! : SETS_PER_PICK;

const creditsOf = ({ exercise }: Candidate) => Object.entries(creditsPerSet(exercise)) as [Muscle, number][];

// Would this many more Sets of the Exercise, a pick's by default, keep each of its primary Muscles within the cap? Its
// week counts the Week Ledger, secondary credit included, and the Sets already planned. Secondary Muscles may go over,
// so compound lifts aren't starved
const withinCap = (
  candidate: Candidate,
  draft: Draft,
  budget: WeeklyBudget,
  weekSoFar: MuscleCredits,
  sets = setsToAdd(draft, candidate),
) => {
  const credits = creditsPerSet(candidate.exercise);
  return candidate.exercise.muscles.primary.every((muscle) => {
    const budgeted = budget[muscle];
    if (budgeted === undefined) return true;
    const planned = (weekSoFar[muscle] ?? 0) + (draft.credits[muscle] ?? 0);
    return planned + (credits[muscle] ?? 0) * sets <= budgeted * WEEKLY_CAP;
  });
};

const emptyDraft = (): Draft => ({
  sets: new Map(),
  fourthSetAfter: new Map(),
  credits: {},
  secondsLeft: WORKOUT_SECONDS,
});

// Does the Exercise credit a Muscle still short of what this stage of the fill order wants for it?
const helpsStage = (candidate: Candidate, stage: WeeklyBudget, ledger: MuscleCredits) =>
  creditsOf(candidate).some(([muscle]) => (ledger[muscle] ?? 0) < (stage[muscle] ?? 0));

// The highest score; the first of a tie, since only a higher score takes over
function highestScore(candidates: readonly Candidate[], week: WeekSoFar): Candidate | undefined {
  let best: { candidate: Candidate; score: number } | undefined;
  for (const candidate of candidates) {
    const score = scoreExercise(candidate.exercise, week);
    if (!best || score > best.score) best = { candidate, score };
  }
  return best?.candidate;
}

const isOneSidedLegExercise = ({ unilateral, ballistic, patterns }: Exercise) =>
  unilateral && !ballistic && patterns.some(({ pattern }) => pattern === "squat" || pattern === "hinge");

// Athletic's one a week, for what only one-sided work gives: one-sided strength and jumps. A one-armed swing still
// drives off both legs, so it doesn't count. It goes first so that a shorter Workout keeps it. Once done, one-sided
// Exercises compete on score like any other
function requiredPick(candidates: readonly Candidate[], thisWeek: readonly LedgerWorkout[], week: WeekSoFar) {
  const trained = thisWeek
    .flatMap(({ workoutExercises }) => workoutExercises)
    .some(({ slug }) => {
      const exercise = exerciseBySlug(slug);
      return exercise && isOneSidedLegExercise(exercise);
    });
  if (week.goal !== "athletic" || trained) return undefined;
  return highestScore(
    candidates.filter(({ exercise }) => isOneSidedLegExercise(exercise)),
    week,
  );
}

// The two-legged loaded squat, in order of preference
const TWO_LEGGED_SQUATS = ["back-squat", "goblet-squat"];
// The Goals that need a heavy two-legged squat every week but score one-sided leg work above it: athletic (#100), and
// build_muscle, whose calves budget (#101) the one-sided squats credit
const SQUAT_GOALS: readonly Goal[] = ["athletic", "build_muscle"];

// One a week for SQUAT_GOALS (athletic's other one): a heavy two-legged squat. It's the first of TWO_LEGGED_SQUATS the
// equipment allows, and the week is done only once that one has had a pick's worth of Sets, so goblet squat doesn't
// stand in for back squat. It never shares a Workout with athletic's one-sided pick, and waits while its Muscles
// recover rather than coming back as a last resort. Once done, it competes on score like any other
function requiredSquat(
  candidates: readonly Candidate[],
  thisWeek: readonly LedgerWorkout[],
  goal: Goal,
  isRested: (candidate: Candidate) => boolean,
) {
  if (!SQUAT_GOALS.includes(goal)) return undefined;
  const squat = TWO_LEGGED_SQUATS.map((slug) => candidates.find(({ exercise }) => exercise.slug === slug)).find(
    (candidate) => candidate !== undefined,
  );
  if (!squat) return undefined;
  const setsThisWeek = thisWeek
    .flatMap(({ workoutExercises }) => workoutExercises)
    .filter(({ slug }) => slug === squat.exercise.slug)
    .reduce((sum, { sets }) => sum + sets.length, 0);
  return setsThisWeek < SETS_PER_PICK && isRested(squat) ? squat : undefined;
}

type Selection = {
  candidates: readonly Candidate[];
  stages: readonly WeeklyBudget[];
  goal: Goal;
  budget: WeeklyBudget;
  limitOf: (muscle: Muscle) => number;
  // False while one of its primary Muscles is over the fatigue limit
  isRested: (candidate: Candidate) => boolean;
  // Athletic's jumps, which go first, then its required pick
  jumps: readonly Candidate[];
  required?: Candidate;
};

// The next pick that fits the time and the cap, by fill order and then score. The limits give way once nothing within
// them helps, then the recovery filter as a last resort, and a 4th Set waits for a stage to run out of new Exercises.
// The cap never gives way
function nextPick(
  { candidates, stages, goal, budget, limitOf, isRested }: Selection,
  draft: Draft,
  ledger: MuscleCredits,
  weekSoFar: MuscleCredits,
) {
  const open = candidates.filter((candidate) => {
    const sets = setsToAdd(draft, candidate);
    return (
      sets > 0 &&
      candidate.exercise.secondsPerSet * sets <= draft.secondsLeft &&
      withinCap(candidate, draft, budget, weekSoFar)
    );
  });
  const withinLimits = open.filter((candidate) =>
    creditsOf(candidate).every(
      ([muscle, credit]) => (draft.credits[muscle] ?? 0) + credit * setsToAdd(draft, candidate) <= limitOf(muscle),
    ),
  );
  const rested = (allowed: readonly Candidate[]) => allowed.filter(isRested);
  for (const allowed of [rested(withinLimits), rested(open), withinLimits, open]) {
    for (const stage of stages) {
      const helping = allowed.filter((candidate) => helpsStage(candidate, stage, ledger));
      const unpicked = helping.filter((candidate) => !draft.sets.has(candidate));
      const week = { goal, budget, ledger };
      const pick = highestScore(unpicked, week) ?? highestScore(helping, week);
      if (pick) return pick;
    }
  }
  return undefined;
}

// Picks until the time or the cap runs out, each pick counting towards the budget before the next. Jumps go first, as
// far as the cap allows, then the required pick. Once the week's budget is met, the rest is picked as a new week's
// would be, up to the cap, so a user who trains anyway still gets a balanced Workout. With nothing left to add, the
// plan ends short of its Length
function selectExercises(selection: Selection, weekSoFar: MuscleCredits): PlannedExercise[] {
  const draft = emptyDraft();
  let ledger = weekSoFar;
  // Jumps keep to the cap like any other pick
  const jumps: Candidate[] = [];
  for (const jump of selection.jumps) {
    if (!withinCap(jump, draft, selection.budget, weekSoFar, JUMP_SETS)) continue;
    jumps.push(jump);
    const credits = creditsPerSet(jump.exercise);
    draft.sets.set(jump, JUMP_SETS);
    draft.credits = addCredits(draft.credits, credits, JUMP_SETS);
    draft.secondsLeft -= jump.exercise.secondsPerSet * JUMP_SETS;
    ledger = addCredits(ledger, credits, JUMP_SETS);
  }
  let budgetMet = false;
  for (;;) {
    const { required } = selection;
    // The required pick keeps to the cap too
    const requiredNow =
      draft.sets.size === jumps.length && required && withinCap(required, draft, selection.budget, weekSoFar);
    let pick = (requiredNow && required) || nextPick(selection, draft, ledger, weekSoFar);
    if (!pick && !budgetMet) {
      budgetMet = true;
      ledger = draft.credits;
      pick = nextPick(selection, draft, ledger, weekSoFar);
    }
    if (!pick) {
      return [...draft.sets].map(([candidate, sets]) => {
        const { exercise, target, change } = candidate;
        const fourthSetAfter = draft.fourthSetAfter.get(candidate);
        return {
          slug: exercise.slug,
          sets,
          target,
          ...(fourthSetAfter && { fourthSetAfter }),
          ...(change && { change }),
        };
      });
    }

    const sets = setsToAdd(draft, pick);
    const credits = creditsPerSet(pick.exercise);
    if (draft.sets.has(pick)) draft.fourthSetAfter.set(pick, draft.sets.size);
    draft.sets.set(pick, (draft.sets.get(pick) ?? 0) + sets);
    draft.credits = addCredits(draft.credits, credits, sets);
    draft.secondsLeft -= pick.exercise.secondsPerSet * sets;
    ledger = addCredits(ledger, credits, sets);
  }
}

// What's planned when the cap leaves nothing to add (story 17): the Recovery Workout, as it credits nothing, if the
// equipment, injuries and time allow every Exercise in it; otherwise the smallest Workout within the cap, one Set of the
// best Exercise that fits, and the Recovery Workout after all when nothing does
function whenCapped(input: PlanWorkoutInput, { candidates, goal, budget }: Selection, ledger: MuscleCredits) {
  const recoveryWorkout: PlannedExercise[] = RECOVERY_WORKOUT.map(({ slug, sets, target }) => ({ slug, sets, target }));
  const exercises = recoveryWorkout.map(({ slug, sets }) => ({ exercise: exerciseBySlug(slug), sets }));
  const allowed = exercises.every(
    ({ exercise }) => exercise && isAvailable(exercise, input.equipmentProfile) && isSafeFor(exercise, input.injuries),
  );
  const seconds = exercises.reduce((total, { exercise, sets }) => total + (exercise?.secondsPerSet ?? 0) * sets, 0);
  if (allowed && seconds <= WORKOUT_SECONDS) return recoveryWorkout;
  const oneSet = candidates.filter((candidate) => withinCap(candidate, emptyDraft(), budget, ledger, 1));
  const pick = highestScore(oneSet, { goal, budget, ledger });
  if (!pick) return recoveryWorkout;
  return [{ slug: pick.exercise.slug, sets: 1, target: pick.target, ...(pick.change && { change: pick.change }) }];
}

// The Recovery Workout's Exercises stay themselves on every built-in choice, as they need no equipment
const recoveryCandidates = (input: PlanWorkoutInput, plannedExercises: readonly PlannedExercise[]) =>
  Object.fromEntries(
    BuiltInEquipment.options
      .filter((choice) => !matchesBuiltIn(input.equipmentProfile, choice))
      .map((choice) => {
        const possible = plannedExercises.flatMap(({ slug, target }) => {
          const exercise = exerciseBySlug(slug);
          return exercise ? [{ exercise, target }] : [];
        });
        return [choice, { possible, pickable: [] }];
      }),
  );

// The tired Muscles an Exercise was left out for, unless one came back as a last resort
function heldBack(candidates: readonly Candidate[], selected: readonly PlannedExercise[], tired: ReadonlySet<Muscle>) {
  const primaryOf = (slug: string) => exerciseBySlug(slug)?.muscles.primary ?? [];
  const planned = new Set(selected.flatMap(({ slug }) => primaryOf(slug)));
  const leftOut = new Set(candidates.flatMap(({ exercise }) => exercise.muscles.primary));
  return [...tired].filter((muscle) => leftOut.has(muscle) && !planned.has(muscle));
}

// The user's next Planned Workout, in priority order. Pure: only the server calls it (ADR 0003). A Recovery Workout
// isn't training, so it's planned as though it never happened
export function planWorkout(input: PlanWorkoutInput): WorkoutPlan {
  const { now, timeZone, goal, daysPerWeek } = input;
  const workouts = trainingWorkouts(input.workouts);
  const monday = mondayOf(now, timeZone);
  const week = { monday, timeZone };
  const thisWeek = workoutsInWeek(workouts, week);
  const lastWeek = workoutsInWeek(workouts, { monday: mondayBefore(monday), timeZone });
  const candidates = pickableExercises(possibleExercises(input), thisWeek, lastWeek, daysPerWeek);
  const budget = weeklyBudget(goal, daysPerWeek);
  const ledger = weekLedger(workouts, week);
  const tired = new Set(tiredMuscles(muscleFatigue(workouts, now)));
  const isRested = ({ exercise }: Candidate) => !exercise.muscles.primary.some((muscle) => tired.has(muscle));
  const selection: Selection = {
    candidates,
    stages: fillOrder(goal, daysPerWeek),
    goal,
    budget,
    limitOf: muscleLimits(budget, Math.max(1, daysPerWeek - thisWeek.length)),
    isRested,
    jumps: jumpsForWorkout(jumpCandidates(input), thisWeek),
    required:
      requiredPick(candidates, thisWeek, { goal, budget, ledger }) ??
      requiredSquat(candidates, thisWeek, goal, isRested),
  };
  // The cap always holds, the Week Ledger counting towards it, so with nothing left to add the plan is whenCapped's.
  // The plan always has an Exercise
  const picked = selectExercises(selection, ledger);
  const selected = picked.length ? picked : whenCapped(input, selection, ledger);
  const held = heldBack(candidates, selected, tired);
  const isRecovery = selected.every(({ slug }) => exerciseBySlug(slug)?.recovery);
  const alternatives = isRecovery ? recoveryCandidates(input, selected) : builtInCandidates(input, thisWeek, lastWeek);
  return {
    weekStart: monday,
    plannedExercises: withAlternatives(selected, alternatives),
    ...(goal === "athletic" && { cue: ATHLETIC_CUE }),
    heldBack: held,
    reasons: planReasons({
      heldBack: held,
      workouts,
      ledger,
      budget,
      workoutsThisWeek: thisWeek.length,
      daysPerWeek,
      timeZone,
    }),
  };
}
