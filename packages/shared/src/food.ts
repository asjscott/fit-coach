import { z } from "zod";

// Where a food came from: USDA FoodData Central, Open Food Facts, the user's Saved Foods, the Coach's Food Ideas, or
// Tell the coach, whose foods and their nutrients come from the words the user typed
export const FoodSource = z.enum(["usda", "off", "saved", "idea", "coach"]);
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

// A food, the same shape whichever source found it (spec #158, "one food shape")
export const Food = z.object({
  source: FoodSource,
  id: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  per100g: Nutrients,
  servings: z.array(Serving),
});
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

// GET /saved-foods: the user's Saved Foods, by name
export const SavedFoods = z.object({ foods: z.array(Food) });
export type SavedFoods = z.infer<typeof SavedFoods>;

// GET /foods/search?q=: what to search for
export const FoodSearchQuery = z.object({ q: z.string().trim().min(1).max(100) });

// The foods matching a search, best first
export const FoodSearchResults = z.object({ foods: z.array(Food) });
export type FoodSearchResults = z.infer<typeof FoodSearchResults>;
