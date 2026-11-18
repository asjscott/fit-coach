import { z } from "zod";
import { LocalDate } from "./check-in";
import { DayMeal } from "./food-entry";

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

// What a day's Food Entries add up to, worked out from them whenever the day is read
export const DayTotals = z.object({
  kcal: z.number(),
  proteinG: z.number(),
  fatG: z.number(),
  carbsG: z.number(),
  fibreG: z.number(),
});
export type DayTotals = z.infer<typeof DayTotals>;

// GET /days/:date: everything Today's rings and the Food tab need for one local date in the user's timezone. Later
// M7 tickets add the Food Ideas and the meal an idea goes into
export const Day = z.object({
  date: LocalDate,
  targets: DailyTargets,
  // Worked out from the meals' Food Entries
  totals: DayTotals,
  // Breakfast, lunch, dinner and snacks, in that order, each with its Food Entries
  meals: z.array(DayMeal),
  // The water the user has logged that day, in ml
  waterMl: z.number(),
});
export type Day = z.infer<typeof Day>;
