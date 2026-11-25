import type { FoodEntry, Meal, Portion } from "@fit/shared";
import { oneDecimal, portionAmount, wholeNumber } from "../nutrition/format";

// The day stepper's words for a day so many days before today
export const dayStepLabel = (daysBefore: number) =>
  daysBefore === 0 ? "Today" : daysBefore === 1 ? "Yesterday" : `${daysBefore} days ago`;

export const mealName = (meal: Meal) => meal[0].toUpperCase() + meal.slice(1);

// "2 foods · 341 kcal": a meal at a glance, before it's opened
export function mealLine(entries: FoodEntry[]) {
  if (!entries.length) return "Nothing yet";
  const kcal = entries.reduce((sum, e) => sum + e.nutrients.kcal, 0);
  return `${entries.length} ${entries.length === 1 ? "food" : "foods"} · ${wholeNumber(kcal)} kcal`;
}

// "80 g", "1 large" or "2 × 1 large": a Food Entry's portion as it was chosen
export function entryPortion({ grams, serving }: Portion) {
  if (!serving) return `${grams < 1 ? portionAmount(grams) : oneDecimal(grams)} g`;
  return serving.count === 1 ? serving.label : `${portionAmount(serving.count)} × ${serving.label}`;
}
