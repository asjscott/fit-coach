import type { Exercise, Muscle } from "@fit/shared";
import { creditsPerSet, type MuscleCredits } from "./week-ledger";
import type { WeeklyBudget } from "./weekly-budget";

// A judgement call, kept in one place: all else equal, loaded work is what a user with the equipment came for
const EXTERNAL_LOAD_FACTOR = 1.15;

// Where the week stands, Exercises already picked for this plan included
export type WeekSoFar = { budget: WeeklyBudget; ledger: MuscleCredits };

// How much an Exercise helps the Muscles furthest behind their budget: credit × remaining budget ÷ budget
export function scoreExercise(exercise: Exercise, { budget, ledger }: WeekSoFar): number {
  let score = 0;
  for (const [muscle, credit] of Object.entries(creditsPerSet(exercise)) as [Muscle, number][]) {
    const budgeted = budget[muscle];
    if (budgeted) score += (credit * Math.max(0, budgeted - (ledger[muscle] ?? 0))) / budgeted;
  }
  return exercise.loadType === "external" ? score * EXTERNAL_LOAD_FACTOR : score;
}
