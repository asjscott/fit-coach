import type { Food } from "@fit/shared";

// One one-tap choice on the Ideas and recent half
export type RecentChoice = { key: string; food: Food; saved: boolean };

// Tells one food from another, whichever source found it
export const foodKey = (food: Food) => `${food.source}:${food.id}`;

// The Ideas and recent half's one-tap choices (spec #158 story 62, prototype variant J): the Saved Foods, then the
// Recent foods. A Recent food that is still one of the Saved Foods is left out, so the Saved Food is offered as it is
// now, edits and all, and only once
export function recentAndSaved(saved: Food[], recent: Food[]): RecentChoice[] {
  const savedKeys = new Set(saved.map(foodKey));
  return [
    ...saved.map((food) => ({ key: foodKey(food), food, saved: true })),
    ...recent
      .filter((food) => !savedKeys.has(foodKey(food)))
      .map((food) => ({ key: foodKey(food), food, saved: false })),
  ];
}

// A meal's copy button: from yesterday on today, from the day before on an earlier day (story 52)
export const copyLabel = (daysBefore: number) =>
  daysBefore === 0 ? "Copy from yesterday" : "Copy from the day before";
