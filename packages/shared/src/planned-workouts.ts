import { z } from "zod";
import { BandLevel, BuiltInEquipment } from "./equipment";
import { Muscle } from "./exercises";

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

// The best Alternative Exercise and up to 2 others
export const MAX_ALTERNATIVE_OPTIONS = 3;

// An Exercise and what to aim for on the equipment it's listed under, with the same Sets as the one it stands in for
export const AlternativeExercise = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  target: SetTarget,
});
export type AlternativeExercise = z.infer<typeof AlternativeExercise>;

export const PlannedExercise = AlternativeExercise.extend({
  sets: z.number().int().positive(),
  // How many of the plan's Exercises come ahead of this one's 4th Set, which the planner can add before a later Exercise.
  // Absent with no 4th Set, and on a plan stored before it, whose 4th Sets count as the lowest priority
  fourthSetAfter: z.number().int().positive().optional(),
  // On each built-in choice the primary doesn't already match: the Exercise itself if it stays, else its Alternative
  // Exercises best first, else nothing as it drops out. Plans stored before Alternative Exercises don't have it
  alternatives: z.partialRecord(BuiltInEquipment, z.array(AlternativeExercise).max(MAX_ALTERNATIVE_OPTIONS)).optional(),
});
export type PlannedExercise = z.infer<typeof PlannedExercise>;

// Why the Coach planned what it did, as codes the phone words and M8's summary reads. Muscles, not groups: the phone
// words them as their groups (MUSCLE_GROUPS)
export const PlanReason = z.discriminatedUnion("code", [
  // Tired Muscles whose Exercises the recovery filter left out, and the day of the last Set for them in the user's
  // timezone
  z.object({ code: z.literal("recovering"), muscles: z.array(Muscle).min(1), lastSetOn: z.iso.date() }),
  // The week's budget was met before this Workout, so it's extra
  z.object({ code: z.literal("budget-met") }),
  // The group or groups of Muscles furthest behind their budget this week
  z.object({ code: z.literal("behind"), muscles: z.array(Muscle).min(1) }),
]);
export type PlanReason = z.infer<typeof PlanReason>;

// The groups reasons name, in the order a tie between them is settled
export const MuscleGroup = z.enum(["legs", "back", "chest", "shoulders", "core"]);
export type MuscleGroup = z.infer<typeof MuscleGroup>;
export const MUSCLE_GROUPS: Record<MuscleGroup, readonly Muscle[]> = {
  legs: ["quads", "hamstrings", "glutes"],
  back: ["lats", "upper_back"],
  chest: ["chest"],
  shoulders: ["side_delts"],
  core: ["abs"],
};

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
  // A cue for the whole Workout, for the user's Goal
  cue: z.string().optional(),
  // In the order the phone shows them; a plan stored before reasons has none, and shows no line
  reasons: z.array(PlanReason).optional(),
});
export type PlannedWorkout = z.infer<typeof PlannedWorkout>;
