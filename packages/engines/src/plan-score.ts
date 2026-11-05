import type { Exercise, Goal, Muscle } from "@fit/shared";
import { creditsPerSet, type MuscleCredits } from "./week-ledger";
import type { WeeklyBudget } from "./weekly-budget";
import { TYPICAL_SECONDS_PER_SET } from "./workout-length";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Every tilt, in one place. All are judgement, the evidence gives only their direction: see
// docs/research/exercise-selection-by-goal.md. All else equal, loaded work is what a user with the equipment came for
const EXTERNAL_LOAD_FACTOR = 1.15;
const GOAL_FACTORS: Record<Goal, (exercise: Exercise) => number> = {
  build_muscle: () => 1,
  recomp: () => 1,
  // About shorter Workouts: nothing here burns more fat, and no copy may say so
  lose_fat: ({ secondsPerSet }) => clamp(Math.sqrt(TYPICAL_SECONDS_PER_SET / secondsPerSet), 0.9, 1.1),
  athletic: ({ ballistic }) => (ballistic ? 1.25 : 1),
};

// Where the week stands, Exercises already picked for this plan included
export type WeekSoFar = { goal: Goal; budget: WeeklyBudget; ledger: MuscleCredits };

// How much an Exercise helps the Muscles furthest behind their budget (credit × remaining budget ÷ budget), tilted
export function scoreExercise(exercise: Exercise, { goal, budget, ledger }: WeekSoFar): number {
  let score = 0;
  for (const [muscle, credit] of Object.entries(creditsPerSet(exercise)) as [Muscle, number][]) {
    const budgeted = budget[muscle];
    if (budgeted) score += (credit * Math.max(0, budgeted - (ledger[muscle] ?? 0))) / budgeted;
  }
  const loadFactor = exercise.loadType === "external" ? EXTERNAL_LOAD_FACTOR : 1;
  return score * loadFactor * GOAL_FACTORS[goal](exercise);
}
