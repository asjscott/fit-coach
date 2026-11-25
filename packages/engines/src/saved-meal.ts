import type { Food, Ingredient, Portion, PortionChoice, SavedMealParts } from "@fit/shared";
import { eachNutrient, portionNutrients, sumNutrients } from "./food-portion";

export type SavedMealFields = { id: string; name: string; cookedGrams?: number } & Pick<
  SavedMealParts,
  "servings" | "ingredients"
>;

// A Saved Meal as a food to log (spec #188, "Saved Meals"), holding what its ingredients do. Its weight, which its
// servings share, is the cooked weight, without which it can't be logged in grams, else its ingredients' together
export function savedMealFood({ id, name, servings, ingredients, cookedGrams }: SavedMealFields): Food {
  const grams = cookedGrams ?? ingredients.reduce((sum, { portion }) => sum + portion.grams, 0);
  const total = sumNutrients(ingredients.map(({ food, portion }) => portionNutrients(food.per100g, portion.grams)));
  return {
    source: "saved_meal",
    id,
    name,
    per100g: eachNutrient((key) => (total[key] / grams) * 100),
    servings: [{ label: "1 serving", grams: grams / servings }],
    savedMeal: { servings, ingredients, gramsAllowed: cookedGrams !== undefined },
  };
}

// How much of each ingredient is in a Saved Meal's portion, given in its own grams. None for any other food
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
