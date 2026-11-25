import { ingredientsAtPortion, portionChoiceOf, portionNutrients, savedMealFood } from "@fit/engines";
import type { Food, FoodEntry, Ingredient, IngredientFood, SavedMealInput } from "@fit/shared";
import { oneDecimal, wholeNumber } from "../nutrition/format";
import { amountOf } from "./food-portion";
import { entryPortion } from "./today-so-far";

// A Saved Meal's fields as typed, and the ingredients chosen so far (spec #188 stories 31 to 35)
export type SavedMealForm = { name: string; servings: string; ingredients: Ingredient[] };

export const EMPTY_SAVED_MEAL: SavedMealForm = { name: "", servings: "", ingredients: [] };

// The form for editing a Saved Meal
export const savedMealForm = ({ name, savedMeal }: Food): SavedMealForm => ({
  name,
  servings: savedMeal ? String(savedMeal.servings) : "",
  ingredients: savedMeal?.ingredients ?? [],
});

// The form for a Saved Meal started from a day's meal: a logged Saved Meal adds its own ingredients, as it can't be one
// (story 33)
export const savedMealFormFromEntries = (entries: FoodEntry[]): SavedMealForm => ({
  ...EMPTY_SAVED_MEAL,
  ingredients: entries.flatMap(({ food, portion }) =>
    isIngredientFood(food) ? [{ food, portion }] : ingredientsAtPortion(food, portion.grams),
  ),
});

const MAX_SERVINGS = 100;

// What to send the API for the form, or the first thing to fix
export function savedMealInput(form: SavedMealForm): { input: SavedMealInput } | { error: string } {
  const name = form.name.trim();
  if (!name) return { error: "Give the Saved Meal a name" };
  const servings = amountOf(form.servings);
  if (!servings) return { error: "Enter how many servings it makes" };
  if (servings > MAX_SERVINGS) return { error: `A Saved Meal makes at most ${MAX_SERVINGS} servings` };
  if (!form.ingredients.length) return { error: "Add at least one ingredient" };
  const ingredients = form.ingredients.map(({ food, portion }) => ({ food, portion: portionChoiceOf(portion) }));
  return { input: { name, servings, ingredients } };
}

// "350 kcal · 34 g protein per serving", as the Saved Meal is built. Null until there's something to divide
export function perServingLine({ name, servings: typed, ingredients }: SavedMealForm): string | null {
  const servings = amountOf(typed);
  if (!servings || !ingredients.length) return null;
  const food = savedMealFood({ id: "", name, servings, ingredients });
  const { kcal, proteinG } = portionNutrients(food.per100g, food.servings[0].grams);
  return `${wholeNumber(kcal)} kcal · ${oneDecimal(proteinG)} g protein per serving`;
}

// The foods that can be an ingredient: any but another Saved Meal
export const isIngredientFood = (food: Food): food is Food & IngredientFood => food.source !== "meal";
export const ingredientFoods = (foods: Food[]) => foods.filter(isIngredientFood);

// "Chicken, 600 g" and "600 kcal"
export const ingredientLine = ({ food, portion }: Ingredient) => ({
  name: `${food.name}, ${entryPortion(portion)}`,
  kcal: `${wholeNumber(portionNutrients(food.per100g, portion.grams).kcal)} kcal`,
});
