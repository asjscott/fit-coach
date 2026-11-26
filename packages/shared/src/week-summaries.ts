import { z } from "zod";
import { LocalDate } from "./check-in";

// A week's daily average of kcal or protein against the range of the days' targets, over the days with food logged
export const WeekAverage = z.object({
  average: z.number(),
  min: z.number(),
  max: z.number(),
  state: z.enum(["below", "in", "over"]),
});
export type WeekAverage = z.infer<typeof WeekAverage>;

// GET /week-summaries/:monday: the Week Summary (GLOSSARY.md), worked out live each time it's asked for (ADR 0009).
// Each optional part is left out when it has no data, never shown as zero. New parts are added here as optional fields
export const WeekSummary = z.object({
  // The week, Monday to Sunday in the user's timezone
  monday: LocalDate,
  sunday: LocalDate,
  // Whether this user has seen this week's summary, on either phone
  seen: z.boolean(),
  // The week the user onboarded in, part of a week, whose planned Workouts are pro-rated
  partWeek: z.boolean(),
  // Workouts finished, Recovery Workouts included, against the days per week (pro-rated for a part week)
  workouts: z.object({ done: z.int(), planned: z.int() }),
  // The Weekly Streak as the week ended: 0 when the week missed it
  streak: z.int(),
  // Only the days with food logged count; absent with none
  kcal: WeekAverage.optional(),
  protein: WeekAverage.optional(),
  // Budgeted Muscles whose credited Sets reached their Weekly Budget, out of all of them; absent with no Workouts
  weeklyBudget: z.object({ met: z.int(), muscles: z.int() }).optional(),
});
export type WeekSummary = z.infer<typeof WeekSummary>;

// What GET /week-summaries/:monday takes: a Monday, or "latest" for the week just ended
export const WeekSummaryMonday = z.union([z.literal("latest"), LocalDate]);
