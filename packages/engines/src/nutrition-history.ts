import type { NutritionWeek } from "@fit/shared";
import { dayAfter, dayBefore, mondayOfDate } from "./local-dates";
import { type NutritionRange, nutritionRanges, rangeState, type RangeState } from "./nutrition-ranges";

// What Nutrition History shows, one at a time
export type NutritionMeasure = "kcal" | "protein";

// One day of Nutrition History's week, its amount and state only once something is logged
export type NutritionHistoryDay = {
  date: string;
  when: "past" | "today" | "toCome";
  range: NutritionRange;
} & ({ logged: false } | ({ logged: true; amount: number } & RangeState));

// A week's days, each against its own range (spec #188)
export function nutritionHistoryDays({ today, days }: NutritionWeek, measure: NutritionMeasure): NutritionHistoryDay[] {
  const key = measure === "kcal" ? "kcal" : "proteinG";
  return days.map(({ date, totals, targets, logged }) => {
    const range = nutritionRanges(targets)[key];
    const when = date < today ? "past" : date === today ? "today" : "toCome";
    const day = { date, when, range } as const;
    return logged
      ? { ...day, logged, amount: totals[key], ...rangeState(totals[key], range) }
      : { ...day, logged: false };
  });
}

// The daily average over the past days with something logged; null with none. Today isn't over, so doesn't count
export function weekAverage(days: readonly NutritionHistoryDay[]): number | null {
  const amounts = days.flatMap((day) => (day.logged && day.when === "past" ? [day.amount] : []));
  return amounts.length ? amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length : null;
}

// So many days in a row with the same range, from the day at this index
export type BandStep = { from: number; days: number; range: NutritionRange };

// The range across the week, a step for each run of days that share one
export function rangeBand(days: readonly NutritionHistoryDay[]): BandStep[] {
  const steps: BandStep[] = [];
  days.forEach(({ range }, i) => {
    const last = steps.at(-1);
    if (last && last.range.min === range.min && last.range.max === range.max) last.days++;
    else steps.push({ from: i, days: 1, range });
  });
  return steps;
}

// The Mondays of the weeks the arrows go to: back to the first logged week, and no later than this one
export function weeksAround({ today, firstLoggedDate, days }: NutritionWeek) {
  const [monday, sunday] = [days[0].date, days[6].date];
  return {
    earlier: firstLoggedDate !== null && firstLoggedDate < monday ? mondayOfDate(dayBefore(monday)) : null,
    later: sunday < today ? dayAfter(sunday) : null,
  };
}
