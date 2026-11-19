import type { Food, Nutrients, Portion, PortionChoice } from "@fit/shared";

const NUTRIENT_KEYS = ["kcal", "proteinG", "carbsG", "fatG", "fibreG"] as const satisfies (keyof Nutrients)[];

// Each nutrient worked out the same way
const eachNutrient = (amount: (key: keyof Nutrients) => number) =>
  Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, amount(key)])) as Nutrients;

// What a portion of a food holds, from its figures per 100 g. Unrounded: the phone rounds for display, and a Food
// Entry's snapshot is worked out from the same numbers
export function portionNutrients(per100g: Nutrients, grams: number): Nutrients {
  return eachNutrient((key) => (per100g[key] * grams) / 100);
}

// What some portions hold together, as a day's totals add up its Food Entries. Nothing for none
export function sumNutrients(portions: Nutrients[]): Nutrients {
  return eachNutrient((key) => portions.reduce((sum, portion) => sum + portion[key], 0));
}

// The grams a portion choice comes to, with the serving it was chosen as. Null for a serving the food doesn't have.
// The API logs by this, and the phone shows what will be logged by it
export function portionOf(food: Food, choice: PortionChoice): Portion | null {
  if ("grams" in choice) return { grams: choice.grams };
  const serving = food.servings.find((s) => s.label === choice.serving);
  if (!serving) return null;
  return { grams: serving.grams * choice.count, serving: { label: serving.label, count: choice.count } };
}
