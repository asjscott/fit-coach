import type { Food, Nutrients, Portion, PortionChoice } from "@fit/shared";

// What a portion of a food holds, from its figures per 100 g. Unrounded: the phone rounds for display, and a Food
// Entry's snapshot is worked out from the same numbers
export function portionNutrients(per100g: Nutrients, grams: number): Nutrients {
  const share = grams / 100;
  return {
    kcal: per100g.kcal * share,
    proteinG: per100g.proteinG * share,
    carbsG: per100g.carbsG * share,
    fatG: per100g.fatG * share,
    fibreG: per100g.fibreG * share,
  };
}

// The grams a portion choice comes to, with the serving it was chosen as. Null for a serving the food doesn't have.
// The API logs by this, and the phone shows what will be logged by it
export function portionOf(food: Food, choice: PortionChoice): Portion | null {
  if ("grams" in choice) return { grams: choice.grams };
  const serving = food.servings.find((s) => s.label === choice.serving);
  if (!serving) return null;
  return { grams: serving.grams * choice.count, serving: { label: serving.label, count: choice.count } };
}
