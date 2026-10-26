import { z } from "zod";
import { BandLevel } from "./equipment";
import { Pattern } from "./exercises";
import { Set } from "./workouts";

const slug = z.string().regex(/^[a-z0-9-]+$/);

// Carry isn't tested: its Working Levels come from hinge
export const TestedPattern = Pattern.exclude(["carry"]);
export type TestedPattern = z.infer<typeof TestedPattern>;

// One Pattern's test as the Assessment read it: the Exercise, its top Set, the maximum estimated from it counting reps
// in reserve, and the Reference Strength that follows (GLOSSARY.md). A weighted test's top Set is the first rated
// RPE 9 or higher; a bodyweight or timed test's is its one Set. The maximum is an e1RM in kg (for a bodyweight test,
// of body weight × the Exercise's share), or for a timed test the seconds held.
// Load-limited: a weighted test that went past 12 reps at its last Set without reaching RPE 9. That Set is the top
// Set, and the maximum is only a lower bound (Epley at 12 reps).
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

// What the Coach will prescribe next for one Exercise (GLOSSARY.md): kg for 8 reps with 2 in reserve, unrounded
// (it's rounded to the user's equipment only when prescribed or shown); reps for a bodyweight Exercise; seconds for
// a timed one; or a band level and reps
export const WorkingLevel = z.discriminatedUnion("unit", [
  z.object({ slug, unit: z.literal("kg"), kg: z.number().positive() }),
  z.object({ slug, unit: z.literal("reps"), reps: z.number().int().positive() }),
  z.object({ slug, unit: z.literal("seconds"), seconds: z.number().positive() }),
  z.object({ slug, unit: z.literal("band"), level: BandLevel, reps: z.number().int().positive() }),
]);
export type WorkingLevel = z.infer<typeof WorkingLevel>;

// GET /assessments/latest: the newest Assessment with the Working Levels it set, or null before the first
export const LatestAssessment = z.object({ assessment: Assessment, workingLevels: z.array(WorkingLevel) }).nullable();
export type LatestAssessment = z.infer<typeof LatestAssessment>;
