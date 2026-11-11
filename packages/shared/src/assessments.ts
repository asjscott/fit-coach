import { z } from "zod";
import { BandLevel } from "./equipment";
import { Pattern } from "./exercises";
import { ProgressionChange } from "./progression";
import { Set } from "./workouts";

const slug = z.string().regex(/^[a-z0-9-]+$/);

// Carry isn't tested: its Working Levels come from hinge
export const TestedPattern = Pattern.exclude(["carry"]);
export type TestedPattern = z.infer<typeof TestedPattern>;

// One Pattern's test as `assess` read it. The maximum is an e1RM in kg, or the seconds held; when load-limited it's
// only a lower bound
export const AssessmentTest = z.object({
  slug,
  topSet: Set,
  maximum: z.number().positive(),
  loadLimited: z.boolean(),
  referenceStrength: z.number().positive(),
  estimated: z.literal(false),
});
export type AssessmentTest = z.infer<typeof AssessmentTest>;

// An untested Pattern (no test was safe, or the test stopped short of RPE 9 at 12 reps or fewer): its Reference
// Strength is estimated from the other Patterns' results
export const AssessmentEstimate = z.object({
  referenceStrength: z.number().positive(),
  estimated: z.literal(true),
});
export type AssessmentEstimate = z.infer<typeof AssessmentEstimate>;

export const AssessmentPattern = z.discriminatedUnion("estimated", [AssessmentTest, AssessmentEstimate]);
export type AssessmentPattern = z.infer<typeof AssessmentPattern>;

// The results of one pair of Assessment Workouts (GLOSSARY.md), a snapshot: deleting either Workout leaves it be
export const Assessment = z.object({
  id: z.uuid(),
  aWorkoutId: z.uuid(),
  bWorkoutId: z.uuid(),
  // When B started: the newest Assessment is the one whose B started last, whenever the server worked it out
  bStartedAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  // The profile's weight when the Assessment was worked out
  bodyWeightKg: z.number().positive(),
  // Every tested Pattern (carry isn't one), each a test or an estimate
  patterns: z.partialRecord(Pattern, AssessmentPattern),
});
export type Assessment = z.infer<typeof Assessment>;

// The Workout that last moved a Working Level, by id and when it started: only a Workout that started later moves it
// again, so a retried, late or past upload never moves it twice or backwards. An Assessment's B sets the first one
export const WorkingLevelMover = z.object({ workoutId: z.uuid(), startedAt: z.iso.datetime() });
export type WorkingLevelMover = z.infer<typeof WorkingLevelMover>;

// What every Working Level records about its progress, whatever its unit
const progress = {
  // null for one only worked out from Reference Strength, which no Workout has set or moved
  movedBy: WorkingLevelMover.nullable(),
  // The run of Misses it's on (GLOSSARY.md), counted over the Workouts that include the Exercise
  misses: z.number().int().nonnegative(),
  // Past the top of what it prescribes, such as a bodyweight seed above 15 reps: the Coach gives the Exercise's
  // progression (its harder variant) instead when the profile can do it, and otherwise holds it at the top
  outgrown: z.boolean(),
  // Why the Workout that last moved it changed it. Absent when that Workout changed nothing, or no Workout has moved it
  change: ProgressionChange.optional(),
};

// What the Coach will prescribe next for one Exercise (GLOSSARY.md): a load in kg and a target reps within the
// Exercise's rep range (repRange in @fit/engines); reps for a bodyweight Exercise; seconds for a timed one; or a band
// level and reps. The load is one the user's equipment has, or unrounded when none is light enough; it's rounded to
// the primary Equipment Profile's loads when prescribed or shown
export const WorkingLevel = z.discriminatedUnion("unit", [
  z.object({ slug, unit: z.literal("kg"), kg: z.number().positive(), reps: z.number().int().positive(), ...progress }),
  z.object({ slug, unit: z.literal("reps"), reps: z.number().int().positive(), ...progress }),
  z.object({ slug, unit: z.literal("seconds"), seconds: z.number().positive(), ...progress }),
  z.object({ slug, unit: z.literal("band"), level: BandLevel, reps: z.number().int().positive(), ...progress }),
]);
export type WorkingLevel = z.infer<typeof WorkingLevel>;

// GET /assessments/latest: the newest Assessment with the Working Levels it set, or null before the first
export const LatestAssessment = z.object({ assessment: Assessment, workingLevels: z.array(WorkingLevel) }).nullable();
export type LatestAssessment = z.infer<typeof LatestAssessment>;
