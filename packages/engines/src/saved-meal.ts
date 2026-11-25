import type { Food, Ingredient, Portion, PortionChoice, SavedMealParts } from "@fit/shared";
import { eachNutrient, portionNutrients, sumNutrients } from "./food-portion";

export type SavedMealFields = { id: string; name: string } & Pick<SavedMealParts, "servings" | "ingredients">;

// A Saved Meal as a food to log (spec #188, "Saved Meals"): one serving is its weight over its servings, and it holds
// what its ingredients hold together
export function savedMealFood({ id, name, servings, ingredients }: SavedMealFields): Food {
  const grams = ingredients.reduce((sum, { portion }) => sum + portion.grams, 0);
  const total = sumNutrients(ingredients.map(({ food, portion }) => portionNutrients(food.per100g, portion.grams)));
  return {
    source: "meal",
    id,
    name,
    per100g: eachNutrient((key) => (total[key] / grams) * 100),
    servings: [{ label: "1 serving", grams: grams / servings }],
    savedMeal: { servings, ingredients, gramsAllowed: false },
  };
}

// How much of each ingredient is in a portion of a Saved Meal, given in the meal's own grams. None for any other food
export function ingredientsAtPortion({ savedMeal, servings }: Food, grams: number): Ingredient[] {
  if (!savedMeal) return [];
  const share = grams / servings[0].grams / savedMeal.servings;
  return savedMeal.ingredients.map(({ food, portion }) => ({
    food,
    portion: {
      grams: portion.grams * share,
      ...(portion.serving && { serving: { ...portion.serving, count: portion.serving.count * share } }),
    },
  }));
}

// The choice a portion was made by, to send it again
export const portionChoiceOf = ({ grams, serving }: Portion): PortionChoice =>
  serving ? { serving: serving.label, count: serving.count } : { grams };
