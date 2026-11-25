import { ingredientsAtPortion, portionChoiceOf, portionNutrients, savedMealFood } from "@fit/engines";
import {
  type Food,
  type FoodEntry,
  type Ingredient,
  type IngredientFood,
  MAX_COOKED_GRAMS,
  MAX_INGREDIENTS,
  MAX_PORTION_COUNT,
  MAX_PORTION_GRAMS,
  MAX_SAVED_MEAL_SERVINGS,
  type SavedMealInput,
} from "@fit/shared";
import { oneDecimal, wholeNumber } from "../nutrition/format";
import { amountOf } from "./food-portion";
import { entryPortion } from "./today-so-far";

// A Saved Meal's fields as typed, and the ingredients chosen so far (spec #188 stories 31 to 35). The cooked
// weight may be left empty (story 40)
export type SavedMealForm = { name: string; servings: string; cookedGrams: string; ingredients: Ingredient[] };

export const EMPTY_SAVED_MEAL: SavedMealForm = { name: "", servings: "", cookedGrams: "", ingredients: [] };

// The form for editing a Saved Meal
export const savedMealForm = ({ name, savedMeal, servings }: Food): SavedMealForm => ({
  name,
  servings: savedMeal ? String(savedMeal.servings) : "",
  // Rounded, as a serving's weight times the servings may be a hair off what was typed
  cookedGrams: savedMeal?.gramsAllowed ? String(Number((servings[0].grams * savedMeal.servings).toFixed(2))) : "",
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

// More of an ingredient than the API takes, as "Save as meal" can scale one to. Null when there isn't
function tooMuch({ food, portion: { grams, serving } }: Ingredient): string | null {
  if (serving ? serving.count <= MAX_PORTION_COUNT : grams <= MAX_PORTION_GRAMS) return null;
  const most = serving ? `${MAX_PORTION_COUNT} × ${serving.label}` : `${wholeNumber(MAX_PORTION_GRAMS)} g`;
  return `${food.name}: an ingredient can be at most ${most}`;
}

// What to send the API for the form, or the first thing to fix
export function savedMealInput(form: SavedMealForm): { input: SavedMealInput } | { error: string } {
  const name = form.name.trim();
  if (!name) return { error: "Give the Saved Meal a name" };
  const servings = amountOf(form.servings);
  if (!servings) return { error: "Enter how many servings it makes" };
  if (servings > MAX_SAVED_MEAL_SERVINGS)
    return { error: `A Saved Meal makes at most ${MAX_SAVED_MEAL_SERVINGS} servings` };
  const cookedGrams = amountOf(form.cookedGrams);
  if (!cookedGrams && form.cookedGrams.trim()) return { error: "Enter the cooked weight in grams, or leave it empty" };
  if (cookedGrams && cookedGrams > MAX_COOKED_GRAMS) {
    return { error: `A Saved Meal weighs at most ${wholeNumber(MAX_COOKED_GRAMS)} g cooked` };
  }
  if (!form.ingredients.length) return { error: "Add at least one ingredient" };
  if (form.ingredients.length > MAX_INGREDIENTS) {
    return { error: `A Saved Meal has at most ${MAX_INGREDIENTS} ingredients` };
  }
  const error = form.ingredients.map(tooMuch).find((message) => message !== null);
  if (error) return { error };
  const ingredients = form.ingredients.map(({ food, portion }) => ({ food, portion: portionChoiceOf(portion) }));
  return { input: { name, servings, ...(cookedGrams && { cookedGrams }), ingredients } };
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
export const isIngredientFood = (food: Food): food is Food & IngredientFood => food.source !== "saved_meal";
export const ingredientFoods = (foods: Food[]) => foods.filter(isIngredientFood);

// "Chicken, 600 g" and "600 kcal"
export const ingredientLine = ({ food, portion }: Ingredient) => ({
  name: `${food.name}, ${entryPortion(portion)}`,
  kcal: `${wholeNumber(portionNutrients(food.per100g, portion.grams).kcal)} kcal`,
});
