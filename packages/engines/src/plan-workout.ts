import type { Exercise, InjuryTag, PlannedExercise, PlannedWorkout, SetTarget, WorkingLevel } from "@fit/shared";
import { EXERCISES } from "./data/exercises";
import { isAvailable, isSafeFor, type ProfileWithLoads } from "./equipment";
import { scoreExercise, type WeekSoFar } from "./plan-score";
import { addCredits, creditsPerSet, mondayOf, weekLedger, type LedgerWorkout } from "./week-ledger";
import { weeklyBudget } from "./weekly-budget";
import { asDone } from "./working-level-sections";
import { WORKING_LEVEL_REPS } from "./working-levels";

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
  workingLevels: readonly WorkingLevel[];
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

// The Exercises this user can be given, in library order, which is what settles a tie
function candidateExercises({ equipmentProfile, injuries, workingLevels }: PlanWorkoutInput): Candidate[] {
  const levels = new Map(workingLevels.map((level) => [level.slug, level]));
  return EXERCISES.flatMap((exercise) => {
    const level = levels.get(exercise.slug);
    if (!level || !isAvailable(exercise, equipmentProfile) || !isSafeFor(exercise, injuries)) return [];
    const target = setTarget(level, exercise, equipmentProfile);
    return target ? [{ exercise, target }] : [];
  });
}

const secondsOf = ({ secondsPerSet }: Exercise) => secondsPerSet * SETS_PER_PICK;

// The highest score that still fits; the first of a tie, since only a higher score takes over
function bestFit(candidates: readonly Candidate[], week: WeekSoFar, secondsLeft: number): Candidate | undefined {
  let best: { candidate: Candidate; score: number } | undefined;
  for (const candidate of candidates) {
    if (secondsOf(candidate.exercise) > secondsLeft) continue;
    const score = scoreExercise(candidate.exercise, week);
    if (!best || score > best.score) best = { candidate, score };
  }
  return best?.candidate;
}

// Picks until the time runs out, each pick counting towards the budget before the next is scored
function selectExercises(candidates: readonly Candidate[], { budget, ledger }: WeekSoFar): PlannedExercise[] {
  const picked: PlannedExercise[] = [];
  let left = candidates;
  let week: WeekSoFar = { budget, ledger };
  let secondsLeft = WORKOUT_SECONDS;
  for (;;) {
    const pick = bestFit(left, week, secondsLeft);
    if (!pick) return picked;
    picked.push({ slug: pick.exercise.slug, sets: SETS_PER_PICK, target: pick.target });
    left = left.filter((candidate) => candidate !== pick);
    week = { budget, ledger: addCredits(week.ledger, creditsPerSet(pick.exercise), SETS_PER_PICK) };
    secondsLeft -= secondsOf(pick.exercise);
  }
}

// The user's next Planned Workout, in priority order. Pure: only the server calls it (ADR 0003)
export function planWorkout(input: PlanWorkoutInput): WorkoutPlan {
  const { workouts, now, timeZone } = input;
  const weekStart = mondayOf(now, timeZone);
  const ledger = weekLedger(workouts, { monday: weekStart, timeZone });
  return {
    weekStart,
    plannedExercises: selectExercises(candidateExercises(input), { budget: weeklyBudget(), ledger }),
  };
}
