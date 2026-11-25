import { z } from "zod";
import { LocalDate } from "./check-in";
import { Food, Nutrients, Portion, PortionChoice } from "./food";
import { RequestId } from "./request-id";

// The four meals of a day, in the order the Food tab lists them
export const Meal = z.enum(["breakfast", "lunch", "dinner", "snacks"]);
export type Meal = z.infer<typeof Meal>;
export const MEALS = Meal.options;

// One food the user ate, in a meal of a day (GLOSSARY.md). The food is kept as it was when logged, and the nutrients
// are its portion's, worked out by the server then: a later change to the food never changes the day (ADR 0002)
export const FoodEntry = z.object({
  id: z.string(),
  date: LocalDate,
  meal: Meal,
  loggedAt: z.iso.datetime(),
  food: Food,
  portion: Portion,
  nutrients: Nutrients,
});
export type FoodEntry = z.infer<typeof FoodEntry>;

// POST /days/:date/food-entries: a food, from any source, into a meal. Saved Foods, Food Ideas and Tell the coach all
// log through this
export const FoodEntryAdd = z.object({
  meal: Meal,
  food: Food,
  portion: PortionChoice,
  requestId: RequestId.optional(),
});
export type FoodEntryAdd = z.infer<typeof FoodEntryAdd>;

// PATCH /food-entries/:id: a new portion or meal, or both
export const FoodEntryChange = z
  .strictObject({ meal: Meal.optional(), portion: PortionChoice.optional() })
  .refine((change) => change.meal || change.portion, "change the meal or the portion");
export type FoodEntryChange = z.infer<typeof FoodEntryChange>;

// POST /days/:date/meals/:meal/copy-from-yesterday: the meal copied from the day before
export const CopyMealParams = z.object({ date: z.union([z.literal("today"), LocalDate]), meal: Meal });
export const CopyMeal = z.object({ requestId: RequestId.optional() });
export type CopyMeal = z.infer<typeof CopyMeal>;

// What a copy added: new Food Entries, in the order they were logged the day before
export const CopiedFoodEntries = z.object({ entries: z.array(FoodEntry) });
export type CopiedFoodEntries = z.infer<typeof CopiedFoodEntries>;

// One meal of a day and its Food Entries, oldest logged first
export const DayMeal = z.object({ meal: Meal, entries: z.array(FoodEntry) });
export type DayMeal = z.infer<typeof DayMeal>;
