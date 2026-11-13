import type { Goal, Muscle } from "@fit/shared";

// Credited Sets per week for each budgeted Muscle; other Muscles are in the Week Ledger but don't drive the plan
export type WeeklyBudget = Partial<Record<Muscle, number>>;

type Dose = { min: number; target: number };

const MAIN_MUSCLES = ["quads", "hamstrings", "glutes", "chest", "lats", "upper_back"] as const;
const LAST_MUSCLES = ["side_delts", "abs"] as const;

// The tunable numbers, all judgement: docs/research/weekly-budget-volume.md weighs the evidence, and spec #77 settled
// its four Goal columns into these two rows. Credited Sets per week, the target being for 4 days per week. Calves have
// a dose of their own, for the two Goals the research found a case for once the library had a calf raise (#101), and
// fill with the last Muscles
const CALVES: Dose = { min: 4, target: 6 };
const DOSES: Record<Goal, { main: Dose; last: Dose; calves?: Dose }> = {
  build_muscle: { main: { min: 10, target: 16 }, last: { min: 6, target: 10 }, calves: CALVES },
  athletic: { main: { min: 10, target: 16 }, last: { min: 6, target: 10 }, calves: CALVES },
  lose_fat: { main: { min: 10, target: 14 }, last: { min: 4, target: 8 } },
  recomp: { main: { min: 10, target: 14 }, last: { min: 4, target: 8 } },
};
const DAYS_SCALE: Record<number, number> = { 2: 0.75, 3: 0.875, 4: 1, 5: 1.125, 6: 1.25 };
const FLOOR = 4;
export const SETS_PER_PICK = 3;
export const MAX_SETS_PER_EXERCISE = 4;
// Soft limits: credited Sets a Muscle takes from one Workout, and the fewest Workouts its budget is spread over
export const MUSCLE_CAP_PER_WORKOUT = 10;
export const MIN_WORKOUTS_PER_MUSCLE = 2;
// The most of its Weekly Budget a Muscle plans in a week, counted from the Week Ledger and the Sets already planned. Past
// about 130% the research finds no use for more Sets: see docs/adr/0007-progression-and-deload.md
export const WEEKLY_CAP = 1.3;
// The recovery filter: a logged Set's fatigue fades in a straight line to nothing over this many hours, and an
// Exercise is left out while any of its primary Muscles is over the limit, in credited Sets (fatigue.ts)
export const FATIGUE_HOURS = 48;
export const FATIGUE_LIMIT = 4;

const eachMuscle = (muscles: readonly Muscle[], value: number): WeeklyBudget =>
  Object.fromEntries(muscles.map((muscle) => [muscle, value]));

function stage(goal: Goal, valueOf: (dose: Dose) => number) {
  const { main, last, calves } = DOSES[goal];
  return {
    main: eachMuscle(MAIN_MUSCLES, valueOf(main)),
    last: { ...eachMuscle(LAST_MUSCLES, valueOf(last)), ...(calves && { calves: valueOf(calves) }) },
  };
}

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
