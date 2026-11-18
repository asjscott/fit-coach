import type { FoodEntry, Meal, Portion } from "@fit/shared";

const DAY_MS = 24 * 60 * 60 * 1000;

// How far back the day stepper goes: today and the 6 days before it, the days the API lets the user log into
export const OLDEST_DAY = 6;

// The day stepper's words for a day so many days before today
export const dayStepLabel = (daysBefore: number) =>
  daysBefore === 0 ? "Today" : daysBefore === 1 ? "Yesterday" : `${daysBefore} days ago`;

// The local date so many calendar days before another, both YYYY-MM-DD
export const dateBefore = (date: string, days: number) =>
  new Date(Date.parse(date) - days * DAY_MS).toISOString().slice(0, 10);

export const mealName = (meal: Meal) => meal[0].toUpperCase() + meal.slice(1);

// "2 foods · 341 kcal": a meal at a glance, before it's opened
export function mealLine(entries: FoodEntry[]) {
  if (!entries.length) return "Nothing yet";
  const kcal = entries.reduce((sum, e) => sum + e.nutrients.kcal, 0);
  return `${entries.length} ${entries.length === 1 ? "food" : "foods"} · ${Math.round(kcal).toLocaleString()} kcal`;
}

const amount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });

// "80 g", "1 large" or "2 × 1 large": a Food Entry's portion as it was chosen
export function entryPortion({ grams, serving }: Portion) {
  if (!serving) return `${amount(grams)} g`;
  return serving.count === 1 ? serving.label : `${amount(serving.count)} × ${serving.label}`;
}
