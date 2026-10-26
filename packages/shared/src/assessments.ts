import { z } from "zod";
import { Pattern } from "./exercises";
import { Set } from "./workouts";

const slug = z.string().regex(/^[a-z0-9-]+$/);

// Carry isn't tested: its Working Levels come from hinge
export const TestedPattern = Pattern.exclude(["carry"]);
export type TestedPattern = z.infer<typeof TestedPattern>;

// One Pattern's test as the Assessment read it: the Exercise, its top Set (the first rated RPE 9 or higher) and the
// maximum estimated from it, counting reps in reserve.
// Still to come: Reference Strength (#36), loadLimited (#38), and an `estimated: true` variant for untested Patterns
export const AssessmentTest = z.object({
  slug,
  topSet: Set,
  maximumKg: z.number().positive(),
  estimated: z.literal(false),
});
export type AssessmentTest = z.infer<typeof AssessmentTest>;

// The results of one pair of Assessment Workouts (GLOSSARY.md), a snapshot: deleting either Workout leaves it be
export const Assessment = z.object({
  id: z.uuid(),
  aWorkoutId: z.uuid(),
  bWorkoutId: z.uuid(),
  createdAt: z.iso.datetime(),
  // The profile's weight when the Assessment was worked out
  bodyWeightKg: z.number().positive(),
  patterns: z.partialRecord(Pattern, AssessmentTest),
});
export type Assessment = z.infer<typeof Assessment>;

// What the Coach will prescribe next for one Exercise (GLOSSARY.md). kg is for 8 reps with 2 in reserve, unrounded:
// it's rounded to the user's equipment only when prescribed or shown.
// Still to come (#36): reps, seconds, and band level + reps units
export const WorkingLevel = z.discriminatedUnion("unit", [
  z.object({ slug, unit: z.literal("kg"), kg: z.number().positive() }),
]);
export type WorkingLevel = z.infer<typeof WorkingLevel>;

// GET /assessments/latest: the newest Assessment with the Working Levels it set, or null before the first
export const LatestAssessment = z.object({ assessment: Assessment, workingLevels: z.array(WorkingLevel) }).nullable();
export type LatestAssessment = z.infer<typeof LatestAssessment>;
