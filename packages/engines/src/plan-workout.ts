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
  type WorkingLevel,
} from "@fit/shared";
import { withAlternatives, type Candidate } from "./alternative-exercises";
import { exerciseBySlug, EXERCISES } from "./data/exercises";
import { BUILT_IN_EQUIPMENT, isAvailable, isSafeFor, matchesBuiltIn, type ProfileWithLoads } from "./equipment";
import { scoreExercise, type WeekSoFar } from "./plan-score";
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
  weeklyBudget,
  type WeeklyBudget,
} from "./weekly-budget";
import { asDone } from "./working-level-sections";
import { MAX_REPS, seedWorkingLevels, WORKING_LEVEL_REPS } from "./working-levels";
import { secondsForSets } from "./workout-length";

// Always the Long version: the day's Workout cuts it to length (daysWorkout)
const WORKOUT_SECONDS = secondsForSets("long");
// The part of power training that survives 8-rep Sets
const ATHLETIC_CUE = "Lift as fast as you can on the way up";

// Everything a plan depends on, so the same inputs give the same plan
export type PlanWorkoutInput = {
  // Finished Workouts, at least all of this week's and last week's; each week keeps its own and counts each once
  workouts: readonly LedgerWorkout[];
  now: Date;
  timeZone: string;
  equipmentProfile: ProfileWithLoads;
  injuries: InjuryTag[];
  // The stored ones; any others are worked out from the Assessment
  workingLevels: readonly WorkingLevel[];
  assessment: Pick<Assessment, "bodyWeightKg" | "patterns">;
  goal: Goal;
  daysPerWeek: number;
};

// What the planner decides; the API gives it an id and a status when it saves it
export type WorkoutPlan = Pick<PlannedWorkout, "weekStart" | "plannedExercises" | "cue">;

// A Set's target from a stored Working Level, or null when it can't be prescribed on this equipment
function setTarget(
  workingLevel: WorkingLevel,
  exercise: Exercise,
  equipmentProfile: ProfileWithLoads,
): SetTarget | null {
  const level = asDone(workingLevel, exercise, equipmentProfile);
  switch (level?.unit) {
    case undefined:
      return null;
    case "kg":
      return { unit: "kg", kg: level.kg, reps: WORKING_LEVEL_REPS };
    case "reps":
      return { unit: "reps", reps: level.reps };
    case "seconds":
      return { unit: "seconds", seconds: level.seconds };
    case "band":
      return { unit: "band", level: level.level, reps: level.reps };
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

const atRepCap = ({ exercise, target }: Candidate) =>
  exercise.loadType === "bodyweight" && target.unit === "reps" && target.reps >= MAX_REPS;

// A bodyweight Exercise at the rep cap has no reps left to add, so it gives way to its progression if the user can do
// that. Band and weighted Exercises go up by level or load instead
function withoutRepCapped(candidates: readonly Candidate[]) {
  const slugs = new Set(candidates.map(({ exercise }) => exercise.slug));
  return candidates.filter((candidate) => {
    const { progression } = candidate.exercise;
    return !(atRepCap(candidate) && progression && slugs.has(progression));
  });
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

// The Exercises this user can be given. Their order settles a tie: last week's first, so that the same Exercises carry
// on from week to week, and otherwise the library's
function candidateExercises(
  input: PlanWorkoutInput,
  thisWeek: readonly LedgerWorkout[],
  lastWeek: readonly LedgerWorkout[],
): Candidate[] {
  const { equipmentProfile, injuries, daysPerWeek } = input;
  const levels = workingLevelsFor(input);
  const possible = EXERCISES.flatMap((exercise) => {
    const level = levels.get(exercise.slug);
    if (!level || !isAvailable(exercise, equipmentProfile) || !isSafeFor(exercise, injuries)) return [];
    const target = setTarget(level, exercise, equipmentProfile);
    return target ? [{ exercise, target }] : [];
  });
  const varied = withinVarietyCap(withoutRepCapped(possible), thisWeek, daysPerWeek);
  const trainedLastWeek = new Set(lastWeek.flatMap(({ workoutExercises }) => workoutExercises.map(({ slug }) => slug)));
  const isLastWeeks = ({ exercise }: Candidate) => trainedLastWeek.has(exercise.slug);
  return [...varied.filter(isLastWeeks), ...varied.filter((candidate) => !isLastWeeks(candidate))];
}

// What the user could be given on each built-in choice the primary doesn't already match, under the same rules as the
// plan itself. It goes in the saved plan, as the phone may have no signal when the user chooses
function builtInCandidates(
  input: PlanWorkoutInput,
  thisWeek: readonly LedgerWorkout[],
  lastWeek: readonly LedgerWorkout[],
) {
  const choices = BuiltInEquipment.options.filter((choice) => !matchesBuiltIn(input.equipmentProfile, choice));
  return Object.fromEntries(
    choices.map((choice) => [
      choice,
      candidateExercises({ ...input, equipmentProfile: BUILT_IN_EQUIPMENT[choice] }, thisWeek, lastWeek),
    ]),
  );
}

// The most credited Sets a Muscle should take from this Workout: half its budget while another Workout is left this
// week, so that it's spread, and never past the cap
function muscleLimits(budget: WeeklyBudget, workoutsLeft: number) {
  const spreadOver = Math.min(workoutsLeft, MIN_WORKOUTS_PER_MUSCLE);
  return (muscle: Muscle) => Math.min(MUSCLE_CAP_PER_WORKOUT, Math.ceil((budget[muscle] ?? Infinity) / spreadOver));
}

// The plan so far. The Map keeps pick order, which is the plan's priority order
type Draft = { sets: Map<Candidate, number>; credits: MuscleCredits; secondsLeft: number };

const setsToAdd = ({ sets }: Draft, candidate: Candidate) =>
  sets.has(candidate) ? MAX_SETS_PER_EXERCISE - sets.get(candidate)! : SETS_PER_PICK;

const creditsOf = ({ exercise }: Candidate) => Object.entries(creditsPerSet(exercise)) as [Muscle, number][];

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

const isOneSidedLift = ({ unilateral, patterns }: Exercise) =>
  unilateral && patterns.some(({ pattern }) => pattern === "squat" || pattern === "hinge");

// Athletic's one a week, for what only one-sided work gives: one-sided strength and jumps. It goes first so that a
// shorter Workout keeps it. Once done, one-sided Exercises compete on score like any other
function requiredPick(candidates: readonly Candidate[], thisWeek: readonly LedgerWorkout[], week: WeekSoFar) {
  const trained = thisWeek
    .flatMap(({ workoutExercises }) => workoutExercises)
    .some(({ slug }) => {
      const exercise = exerciseBySlug(slug);
      return exercise && isOneSidedLift(exercise);
    });
  if (week.goal !== "athletic" || trained) return undefined;
  const oneSidedLifts = candidates.filter(({ exercise }) => isOneSidedLift(exercise));
  return highestScore(oneSidedLifts, week);
}

type Selection = {
  candidates: readonly Candidate[];
  stages: readonly WeeklyBudget[];
  goal: Goal;
  budget: WeeklyBudget;
  limitOf: (muscle: Muscle) => number;
  required?: Candidate;
};

// The next pick that fits the time, by fill order and then score. A Muscle no candidate credits never holds up a
// stage. The limits are soft, so they give way once nothing within them helps. A 4th Set waits for a stage to run out
// of new Exercises
function nextPick({ candidates, stages, goal, budget, limitOf }: Selection, draft: Draft, ledger: MuscleCredits) {
  const open = candidates.filter((candidate) => {
    const sets = setsToAdd(draft, candidate);
    return sets > 0 && candidate.exercise.secondsPerSet * sets <= draft.secondsLeft;
  });
  const withinLimits = open.filter((candidate) =>
    creditsOf(candidate).every(
      ([muscle, credit]) => (draft.credits[muscle] ?? 0) + credit * setsToAdd(draft, candidate) <= limitOf(muscle),
    ),
  );
  for (const allowed of [withinLimits, open]) {
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

// Picks until the time runs out, each pick counting towards the budget before the next. Once the week's budget is met,
// the rest is picked as a new week's would be, so a user who trains anyway still gets a balanced Workout
function selectExercises(selection: Selection, weekSoFar: MuscleCredits): PlannedExercise[] {
  const draft: Draft = { sets: new Map(), credits: {}, secondsLeft: WORKOUT_SECONDS };
  let ledger = weekSoFar;
  let budgetMet = false;
  for (;;) {
    let pick = (draft.sets.size === 0 && selection.required) || nextPick(selection, draft, ledger);
    if (!pick && !budgetMet) {
      budgetMet = true;
      ledger = draft.credits;
      pick = nextPick(selection, draft, ledger);
    }
    if (!pick) return [...draft.sets].map(([{ exercise, target }, sets]) => ({ slug: exercise.slug, sets, target }));

    const sets = setsToAdd(draft, pick);
    const credits = creditsPerSet(pick.exercise);
    draft.sets.set(pick, (draft.sets.get(pick) ?? 0) + sets);
    draft.credits = addCredits(draft.credits, credits, sets);
    draft.secondsLeft -= pick.exercise.secondsPerSet * sets;
    ledger = addCredits(ledger, credits, sets);
  }
}

// The user's next Planned Workout, in priority order. Pure: only the server calls it (ADR 0003)
export function planWorkout(input: PlanWorkoutInput): WorkoutPlan {
  const { workouts, now, timeZone, goal, daysPerWeek } = input;
  const monday = mondayOf(now, timeZone);
  const week = { monday, timeZone };
  const thisWeek = workoutsInWeek(workouts, week);
  const lastWeek = workoutsInWeek(workouts, { monday: mondayBefore(monday), timeZone });
  const candidates = candidateExercises(input, thisWeek, lastWeek);
  const budget = weeklyBudget(goal, daysPerWeek);
  const ledger = weekLedger(workouts, week);
  const selection: Selection = {
    candidates,
    stages: fillOrder(goal, daysPerWeek),
    goal,
    budget,
    limitOf: muscleLimits(budget, Math.max(1, daysPerWeek - thisWeek.length)),
    required: requiredPick(candidates, thisWeek, { goal, budget, ledger }),
  };
  return {
    weekStart: monday,
    plannedExercises: withAlternatives(
      selectExercises(selection, ledger),
      builtInCandidates(input, thisWeek, lastWeek),
    ),
    ...(goal === "athletic" && { cue: ATHLETIC_CUE }),
  };
}
