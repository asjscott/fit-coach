import type { Nutrients } from "@fit/shared";

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
