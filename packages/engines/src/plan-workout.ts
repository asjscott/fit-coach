import type {
  Assessment,
  Exercise,
  Goal,
  InjuryTag,
  Muscle,
  PlannedExercise,
  PlannedWorkout,
  SetTarget,
  WorkingLevel,
} from "@fit/shared";
import { EXERCISES } from "./data/exercises";
import { isAvailable, isSafeFor, type ProfileWithLoads } from "./equipment";
import { scoreExercise, type WeekSoFar } from "./plan-score";
import {
  addCredits,
  creditsPerSet,
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
  weeklyBudget,
  type WeeklyBudget,
} from "./weekly-budget";
import { asDone } from "./working-level-sections";
import { seedWorkingLevels, WORKING_LEVEL_REPS } from "./working-levels";

const SETS_PER_PICK = 3;
const WORKOUT_SECONDS = 45 * 60;

// Everything a plan depends on, so the same inputs give the same plan
export type PlanWorkoutInput = {
  // Finished Workouts, at least all of this week's; the Week Ledger keeps those in the week and counts each once
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
export type WorkoutPlan = Pick<PlannedWorkout, "weekStart" | "plannedExercises">;

type Candidate = { exercise: Exercise; target: SetTarget };

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

// The Exercises this user can be given, in library order, which is what settles a tie
function candidateExercises(input: PlanWorkoutInput): Candidate[] {
  const { equipmentProfile, injuries } = input;
  const levels = workingLevelsFor(input);
  return EXERCISES.flatMap((exercise) => {
    const level = levels.get(exercise.slug);
    if (!level || !isAvailable(exercise, equipmentProfile) || !isSafeFor(exercise, injuries)) return [];
    const target = setTarget(level, exercise, equipmentProfile);
    return target ? [{ exercise, target }] : [];
  });
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

type Selection = {
  candidates: readonly Candidate[];
  stages: readonly WeeklyBudget[];
  budget: WeeklyBudget;
  limitOf: (muscle: Muscle) => number;
};

// The next pick that fits the time, by fill order and then score. A Muscle no candidate credits never holds up a
// stage. The limits are soft, so they give way once nothing within them helps. A 4th Set waits for a stage to run out
// of new Exercises
function nextPick({ candidates, stages, budget, limitOf }: Selection, draft: Draft, ledger: MuscleCredits) {
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
      const pick = highestScore(unpicked, { budget, ledger }) ?? highestScore(helping, { budget, ledger });
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
    let pick = nextPick(selection, draft, ledger);
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
  const budget = weeklyBudget(goal, daysPerWeek);
  const selection: Selection = {
    candidates: candidateExercises(input),
    stages: fillOrder(goal, daysPerWeek),
    budget,
    limitOf: muscleLimits(budget, Math.max(1, daysPerWeek - workoutsInWeek(workouts, week).length)),
  };
  return { weekStart: monday, plannedExercises: selectExercises(selection, weekLedger(workouts, week)) };
}
