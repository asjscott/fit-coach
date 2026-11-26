import { z } from "zod";
import { LocalDate } from "./check-in";
import { Muscle } from "./exercises";
import { SetTarget } from "./planned-workouts";
import { Pr } from "./workouts";

const RangeStateName = z.enum(["below", "in", "over"]);

// A week's daily average of kcal or protein against the range of the days' targets, over the days with food logged
export const WeekAverage = z.object({
  average: z.number(),
  min: z.number(),
  max: z.number(),
  state: RangeStateName,
});
export type WeekAverage = z.infer<typeof WeekAverage>;

// The week's kcal: the average, and each day with food logged against that day's own range
export const WeekKcal = WeekAverage.extend({
  days: z.array(z.object({ date: LocalDate, kcal: z.number(), state: RangeStateName })),
});
export type WeekKcal = z.infer<typeof WeekKcal>;

// An Exercise whose Working Level a Workout that week moved up or down, why, and the level it's at now
export const WorkingLevelMove = z.object({
  slug: z.string(),
  direction: z.enum(["up", "down"]),
  // The ProgressionChange codes that move a level up or down
  change: z.enum(["target-up", "seconds-up", "load-up", "load-down", "target-down"]),
  level: SetTarget,
});
export type WorkingLevelMove = z.infer<typeof WorkingLevelMove>;

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
  kcal: WeekKcal.optional(),
  protein: WeekAverage.optional(),
  // Budgeted Muscles whose credited Sets reached their Weekly Budget, out of all of them; absent with no Workouts.
  // The Muscles short of it are listed with their credited Sets against their budget
  weeklyBudget: z
    .object({
      met: z.int(),
      muscles: z.int(),
      short: z.array(z.object({ muscle: Muscle, sets: z.number(), budget: z.int() })),
    })
    .optional(),
  // The Block's deload week, lighter on purpose; absent on any other week, and before the first Assessment
  deload: z.literal(true).optional(),
  // PRs set by the week's Workouts; absent with none
  prs: z.array(Pr).min(1).optional(),
  // Working Levels that Workouts that week moved up or down; absent with none
  moves: z.array(WorkingLevelMove).min(1).optional(),
  // The week's Weigh-in and its change since the one before; absent without both
  weighIn: z.object({ kg: z.number(), changeKg: z.number() }).optional(),
  // The average Readiness of the week's Check-ins (3 to 15), and the week before's when it had any; absent with none
  readiness: z.object({ average: z.number(), previous: z.number().optional() }).optional(),
  // The Coach's sentence on the week and the line under it, from templates (weekVerdict in @fit/engines)
  coach: z.object({ sentence: z.string(), line: z.string() }),
});
export type WeekSummary = z.infer<typeof WeekSummary>;

// What GET /week-summaries/:monday takes: a Monday, or "latest" for the week just ended
export const WeekSummaryMonday = z.union([z.literal("latest"), LocalDate]);
