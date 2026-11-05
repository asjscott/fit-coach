import { z } from "zod";
import { BandLevel, BuiltInEquipment } from "./equipment";

const reps = z.number().int().positive();

// What the Coach prescribes for each Set of an Exercise: its Working Level as the user would do it. kg is a load the
// Equipment Profile has, so unlike a logged Set's it's only as round as the profile's loads
export const SetTarget = z.discriminatedUnion("unit", [
  z.object({ unit: z.literal("kg"), kg: z.number().positive(), reps }),
  z.object({ unit: z.literal("reps"), reps }),
  z.object({ unit: z.literal("seconds"), seconds: z.number().int().positive() }),
  z.object({ unit: z.literal("band"), level: BandLevel, reps }),
]);
export type SetTarget = z.infer<typeof SetTarget>;

// An Exercise and what to aim for on the equipment it's listed under, with the same Sets as the one it stands in for
export const AlternativeExercise = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  target: SetTarget,
});
export type AlternativeExercise = z.infer<typeof AlternativeExercise>;

export const PlannedExercise = AlternativeExercise.extend({
  sets: z.number().int().positive(),
  // On each built-in choice the primary doesn't already match: the Exercise itself if it stays, else its Alternative
  // Exercises best first, else nothing as it drops out. Plans stored before Alternative Exercises don't have it
  alternatives: z.partialRecord(BuiltInEquipment, z.array(AlternativeExercise).max(3)).optional(),
});
export type PlannedExercise = z.infer<typeof PlannedExercise>;

// One is current at a time; the others are kept, so a Workout started from one can still link to it (ADR 0003)
export const PlannedWorkoutStatus = z.enum(["current", "finished", "replaced"]);
export type PlannedWorkoutStatus = z.infer<typeof PlannedWorkoutStatus>;

// What the Coach prescribes next (GLOSSARY.md), built by the server. Exercises are in the planner's priority order
export const PlannedWorkout = z.object({
  id: z.uuid(),
  status: PlannedWorkoutStatus,
  // The Monday of the week it was built for, as a date in the user's timezone
  weekStart: z.iso.date(),
  createdAt: z.iso.datetime(),
  plannedExercises: z.array(PlannedExercise).min(1),
});
export type PlannedWorkout = z.infer<typeof PlannedWorkout>;
