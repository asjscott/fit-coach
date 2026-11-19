import type { Food, SavedFoodInput } from "@fit/shared";

// Create food's fields as typed, read off a label: one serving and what it holds (spec #158 story 67)
export type SavedFoodForm = {
  name: string;
  brand: string;
  servingLabel: string;
  servingGrams: string;
  kcal: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  fibreG: string;
};

export const EMPTY_FORM: SavedFoodForm = {
  name: "",
  brand: "",
  servingLabel: "",
  servingGrams: "",
  kcal: "",
  proteinG: "",
  carbsG: "",
  fatG: "",
  fibreG: "",
};

const NUTRIENT_NAMES = { kcal: "kcal", proteinG: "protein", carbsG: "carbs", fatG: "fat", fibreG: "fibre" } as const;

// A typed number, a decimal comma read as a point. Undefined when empty, NaN when it isn't a number
const numberOf = (text: string) => (text.trim() === "" ? undefined : Number(text.trim().replace(",", ".")));

// What to send the API for the form, or the first thing to fix. Fibre may be left empty; the barcode is the one
// scanned, when Create food came from a scan
export function savedFoodInput(form: SavedFoodForm, barcode?: string): { input: SavedFoodInput } | { error: string } {
  const name = form.name.trim();
  if (!name) return { error: "Give the food a name" };
  const grams = numberOf(form.servingGrams);
  if (!grams || !(grams > 0)) return { error: "Enter the serving's weight in grams" };
  const perServing: Partial<SavedFoodInput["perServing"]> = {};
  for (const key of Object.keys(NUTRIENT_NAMES) as (keyof typeof NUTRIENT_NAMES)[]) {
    const amount = numberOf(form[key]);
    if (amount === undefined && key === "fibreG") continue;
    if (amount === undefined || !(amount >= 0)) return { error: `Enter the ${NUTRIENT_NAMES[key]} per serving` };
    perServing[key] = amount;
  }
  const brand = form.brand.trim();
  const label = form.servingLabel.trim();
  return {
    input: {
      name,
      ...(brand ? { brand } : {}),
      ...(barcode ? { barcode } : {}),
      serving: { ...(label ? { label } : {}), grams },
      perServing: perServing as SavedFoodInput["perServing"],
    },
  };
}

const tenth = (amount: number) => String(Math.round(amount * 10) / 10);

// The form for editing a Saved Food: its first serving, which is the label's, and what that holds
export function savedFoodForm(food: Food): SavedFoodForm {
  const serving = food.servings[0] ?? { label: "", grams: 100 };
  const inServing = (per100g: number) => tenth((per100g * serving.grams) / 100);
  return {
    name: food.name,
    brand: food.brand ?? "",
    servingLabel: serving.label === "1 serving" ? "" : serving.label,
    servingGrams: tenth(serving.grams),
    kcal: inServing(food.per100g.kcal),
    proteinG: inServing(food.per100g.proteinG),
    carbsG: inServing(food.per100g.carbsG),
    fatG: inServing(food.per100g.fatG),
    fibreG: inServing(food.per100g.fibreG),
  };
}
