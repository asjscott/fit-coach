import { z } from "zod";
import { RequestId } from "./request-id";

// Where a food came from: USDA FoodData Central, Open Food Facts, the user's Saved Foods, the Coach's Food Ideas, Tell
// the coach, whose foods and their nutrients come from the words the user typed, or the user's Saved Meals
export const FoodSource = z.enum(["usda", "off", "saved", "idea", "coach", "saved_meal"]);
export type FoodSource = z.infer<typeof FoodSource>;

// What a weight of food holds. A food's are per 100 g; fibre is 0 when its source has no figure
export const Nutrients = z.object({
  kcal: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  fibreG: z.number().nonnegative(),
});
export type Nutrients = z.infer<typeof Nutrients>;

// One of a food's own portions, such as "1 large egg" at 50 g
export const Serving = z.object({ label: z.string().min(1), grams: z.number().positive() });
export type Serving = z.infer<typeof Serving>;

// The most of a food in one portion, by grams or by a count of a serving
export const MAX_PORTION_GRAMS = 5000;
export const MAX_PORTION_COUNT = 100;

// How much of a food the user ate, as they chose it: grams, or a count of one of the food's own servings by its label
export const PortionChoice = z.union([
  z.strictObject({ grams: z.number().positive().max(MAX_PORTION_GRAMS) }),
  z.strictObject({ serving: z.string().min(1), count: z.number().positive().max(MAX_PORTION_COUNT) }),
]);
export type PortionChoice = z.infer<typeof PortionChoice>;

// A logged portion: its grams, and the serving and count it was chosen as, if it was
export const Portion = z.object({
  grams: z.number().positive(),
  serving: z.object({ label: z.string(), count: z.number().positive() }).optional(),
});
export type Portion = z.infer<typeof Portion>;

const FoodFields = z.object({
  source: FoodSource,
  id: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  per100g: Nutrients,
  servings: z.array(Serving),
});

// A food as a Saved Meal keeps it: anything but another Saved Meal
export const IngredientFood = FoodFields.extend({ source: FoodSource.exclude(["saved_meal"]) });
export type IngredientFood = z.infer<typeof IngredientFood>;

// An ingredient of a Saved Meal: a food as it was when added, and how much of it
export const Ingredient = z.object({ food: IngredientFood, portion: Portion });
export type Ingredient = z.infer<typeof Ingredient>;

// What a Food made from a Saved Meal carries, so a Food Entry's snapshot opens to its ingredients (ADR 0002): those of
// the whole Saved Meal, how many servings it makes, and whether it can be logged in grams
export const SavedMealParts = z.object({
  servings: z.number().positive(),
  ingredients: z.array(Ingredient).min(1),
  gramsAllowed: z.boolean(),
});
export type SavedMealParts = z.infer<typeof SavedMealParts>;

// A food, the same shape whichever source found it (spec #158, "one food shape"). One from a Saved Meal has its parts,
// and its one serving first
export const Food = FoodFields.extend({ savedMeal: SavedMealParts.optional() }).refine(
  ({ source, savedMeal, servings }) => (source === "saved_meal") === !!savedMeal && (!savedMeal || servings.length > 0),
  "only a food from a Saved Meal has its ingredients and serving",
);
export type Food = z.infer<typeof Food>;

// A product barcode as a phone reads it: EAN-8, UPC-A, EAN-13 or a GTIN-14, digits only
export const Barcode = z.string().regex(/^\d{8,14}$/, "A barcode is 8 to 14 digits");

// GET /foods/barcode/:code
export const BarcodeParams = z.object({ code: Barcode });

// Create food, or editing a Saved Food: what a label says (spec #158 story 67). One serving, its grams and what it
// holds; the API keeps the nutrients per 100 g and the serving as the food's first. Fibre is optional, being 0 when
// the label has none
export const SavedFoodInput = z.object({
  name: z.string().trim().min(1).max(100),
  brand: z.string().trim().min(1).max(100).optional(),
  barcode: Barcode.optional(),
  serving: z.object({ label: z.string().trim().min(1).max(40).optional(), grams: z.number().positive().max(5000) }),
  perServing: Nutrients.extend({ fibreG: z.number().nonnegative().default(0) }),
});
export type SavedFoodInput = z.input<typeof SavedFoodInput>;

// What a Saved Meal can be
export const MAX_SAVED_MEAL_SERVINGS = 100;
export const MAX_INGREDIENTS = 50;
export const MAX_COOKED_GRAMS = 100_000;

// A new Saved Meal, or an edited one: its ingredients' grams are worked out by the server, as a Food Entry's are
export const SavedMealInput = z.object({
  name: z.string().trim().min(1).max(100),
  servings: z.number().positive().max(MAX_SAVED_MEAL_SERVINGS),
  // What it weighs cooked, so it can be logged in grams too
  cookedGrams: z.number().positive().max(MAX_COOKED_GRAMS).optional(),
  ingredients: z
    .array(z.object({ food: IngredientFood, portion: PortionChoice }))
    .min(1)
    .max(MAX_INGREDIENTS),
});
export type SavedMealInput = z.infer<typeof SavedMealInput>;

// POST /saved-meals
export const SavedMealCreate = SavedMealInput.extend({ requestId: RequestId.optional() });
export type SavedMealCreate = z.infer<typeof SavedMealCreate>;

// GET /saved-foods: the user's Saved Foods and Saved Meals, by name
export const SavedFoods = z.object({ foods: z.array(Food) });
export type SavedFoods = z.infer<typeof SavedFoods>;

// GET /foods/recent: the foods the user has logged, each once as last logged, most recent first
export const RecentFoods = z.object({ foods: z.array(Food) });
export type RecentFoods = z.infer<typeof RecentFoods>;

// GET /foods/search?q=: what to search for
export const FoodSearchQuery = z.object({ q: z.string().trim().min(1).max(100) });

// The foods matching a search, best first. `outsideUnavailable` when the outside source couldn't be searched, so only
// the user's Saved Foods and Saved Meals are listed
export const FoodSearchResults = z.object({ foods: z.array(Food), outsideUnavailable: z.boolean().optional() });
export type FoodSearchResults = z.infer<typeof FoodSearchResults>;
