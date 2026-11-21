import { z } from "zod";
import { LocalDate } from "./check-in";
import { Nutrients, Serving } from "./food";
import { DayMeal, Meal } from "./food-entry";
import { AvoidedFood } from "./user";

// What the Coach sets the user for each day, the same every day (GLOSSARY.md). Worked out by the server whenever a
// day is read, never stored
export const DailyTargets = z.object({
  kcal: z.number(),
  proteinG: z.number(),
  fatG: z.number(),
  carbsG: z.number(),
  fibreG: z.number(),
  waterMl: z.number(),
});
export type DailyTargets = z.infer<typeof DailyTargets>;

// What a Food Idea is, which the Diet allows or rules out: meat and fish are neither, vegetarian has no meat or fish,
// vegan nothing from an animal
export const FoodIdeaKind = z.enum(["meat", "fish", "vegetarian", "vegan"]);
export type FoodIdeaKind = z.infer<typeof FoodIdeaKind>;

// A food from the Coach's own list, with a set portion and what that portion holds (GLOSSARY.md)
export const FoodIdea = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  portion: Serving,
  nutrients: Nutrients,
  kind: FoodIdeaKind,
  // What it holds from the foods a Diet can avoid
  contains: z.array(AvoidedFood),
});
export type FoodIdea = z.infer<typeof FoodIdea>;

// GET /days/:date: everything Today's rings and the Food tab need for one local date in the user's timezone
export const Day = z.object({
  date: LocalDate,
  targets: DailyTargets,
  // What the meals' Food Entries add up to, worked out whenever the day is read
  totals: Nutrients,
  // Breakfast, lunch, dinner and snacks, in that order, each with its Food Entries
  meals: z.array(DayMeal),
  // The water the user has logged that day, in ml
  waterMl: z.number(),
  // Up to two Food Ideas the user's Diet allows to fill what's left of the day; none once protein is met
  ideas: z.array(FoodIdea),
  // The meal Add puts an idea into: the one for the time of day now, in the user's timezone
  ideaMeal: Meal,
});
export type Day = z.infer<typeof Day>;

// One glass of water on the Food tab, in ml: the steps the phone sets the day's water in
export const WATER_GLASS_ML = 250;

// PUT /days/:date/water: the day's water as a total, not a change, so a repeated request is harmless
export const WaterUpdate = z.object({
  waterMl: z.int().min(0).max(20_000).multipleOf(WATER_GLASS_ML, { error: "Water is set in 250 ml glasses" }),
});
export type WaterUpdate = z.infer<typeof WaterUpdate>;

// What PUT /days/:date/water answers: the date's water as it's now stored
export const WaterDay = z.object({ date: LocalDate, waterMl: z.number() });
export type WaterDay = z.infer<typeof WaterDay>;
