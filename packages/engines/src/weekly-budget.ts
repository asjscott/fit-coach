import type { Goal, Muscle } from "@fit/shared";

// Credited Sets per week for each budgeted Muscle; other Muscles are in the Week Ledger but don't drive the plan
export type WeeklyBudget = Partial<Record<Muscle, number>>;

type Dose = { min: number; target: number };

const MAIN_MUSCLES = ["quads", "hamstrings", "glutes", "chest", "lats", "upper_back"] as const;
const LAST_MUSCLES = ["side_delts", "abs"] as const;

// The tunable numbers, all judgement: docs/research/weekly-budget-volume.md weighs the evidence, and spec #77 settled
// its four Goal columns into these two rows. Credited Sets per week, the target being for 4 days per week
const DOSES: Record<Goal, { main: Dose; last: Dose }> = {
  build_muscle: { main: { min: 10, target: 16 }, last: { min: 6, target: 10 } },
  athletic: { main: { min: 10, target: 16 }, last: { min: 6, target: 10 } },
  lose_fat: { main: { min: 10, target: 14 }, last: { min: 4, target: 8 } },
  recomp: { main: { min: 10, target: 14 }, last: { min: 4, target: 8 } },
};
const DAYS_SCALE: Record<number, number> = { 2: 0.75, 3: 0.875, 4: 1, 5: 1.125, 6: 1.25 };
const FLOOR = 4;
export const MAX_SETS_PER_EXERCISE = 4;
// Soft limits: credited Sets a Muscle takes from one Workout, and the fewest Workouts its budget is spread over
export const MUSCLE_CAP_PER_WORKOUT = 10;
export const MIN_WORKOUTS_PER_MUSCLE = 2;

const eachMuscle = (muscles: readonly Muscle[], value: number): WeeklyBudget =>
  Object.fromEntries(muscles.map((muscle) => [muscle, value]));

const stage = (goal: Goal, valueOf: (dose: Dose) => number) => ({
  main: eachMuscle(MAIN_MUSCLES, valueOf(DOSES[goal].main)),
  last: eachMuscle(LAST_MUSCLES, valueOf(DOSES[goal].last)),
});

// Half rounds up
export const scaledBudget = ({ min, target }: Dose, daysPerWeek: number) =>
  Math.max(min, Math.floor(target * DAYS_SCALE[daysPerWeek] + 0.5));

export function weeklyBudget(goal: Goal, daysPerWeek: number): WeeklyBudget {
  const { main, last } = stage(goal, (dose) => scaledBudget(dose, daysPerWeek));
  return { ...main, ...last };
}

// How the week fills when time can't cover the budget: the credited Sets each stage's Muscles reach before the next
// stage starts
export function fillOrder(goal: Goal, daysPerWeek: number): WeeklyBudget[] {
  const floor = stage(goal, () => FLOOR);
  const min = stage(goal, (dose) => dose.min);
  const budget = stage(goal, (dose) => scaledBudget(dose, daysPerWeek));
  return [{ ...floor.main, ...floor.last }, { ...min.main, ...min.last }, budget.main, budget.last];
}
