import {
  TestedPattern,
  type Assessment,
  type AssessmentPattern,
  type AssessmentTest,
  type BodyProfile,
  type Set,
  type WorkingLevel,
  type Workout,
} from "@fit/shared";
import { isLoadLimited, isTopSet, TOP_SET_RPE } from "./assessment-protocol";
import { ASSESSMENT_PATTERNS, testedPatternOf } from "./assessment-tests";
import { e1rm, epley, MAX_E1RM_REPS } from "./e1rm";
import type { ProfileWithLoads } from "./equipment";
import { KG_PATTERNS, referenceStrength, STRENGTH_RATIOS, typicalReferenceStrength } from "./strength-ratios";
import { seedWorkingLevels } from "./working-levels";

// A weighted test's top Set is the first rated RPE 9 or higher, or when it's load-limited, its last Set. A bodyweight
// or timed test is its one Set, to the most the user could do. None means the test is untested
function topSetOf(sets: Set[]): { topSet: Set; loadLimited: boolean } | null {
  const [first] = sets;
  if (!first) return null;
  if (first.kind !== "external") return { topSet: first, loadLimited: false };
  if (isLoadLimited(sets)) return { topSet: sets[sets.length - 1], loadLimited: true };
  const topSet = sets.find(isTopSet);
  return topSet ? { topSet, loadLimited: false } : null;
}

// The reps a weighted Set would have reached to failure: reps in reserve count, and an unrated Set counts as RPE 9
const repsToFailure = ({ reps, rpe = TOP_SET_RPE }: { reps: number; rpe?: number }) => reps + (10 - rpe);

// Weighted stops at 12 reps, past which Epley isn't trusted. Bodyweight takes the reps done to failure uncapped: its
// Working Level inverts the same formula and must give the test's own reps back
function maximumOf(slug: string, set: Set, bodyWeightKg: number) {
  switch (set.kind) {
    case "external":
      return e1rm(set.kg, Math.min(repsToFailure(set), MAX_E1RM_REPS));
    case "bodyweight": {
      const entry = STRENGTH_RATIOS[slug];
      if (entry?.kind !== "bodyweight") throw new Error(`"${slug}" isn't a bodyweight Exercise`);
      return epley(bodyWeightKg * entry.share, set.reps);
    }
    case "timed":
      return set.seconds;
  }
}

// A Pattern that wasn't measured is estimated a fifth lighter than the others suggest: it's the softer number, and it's
// often untested because of an injury
const ESTIMATE_SHARE = 0.8;
// Core's estimate when the plank wasn't tested: plank seconds don't follow from strength in kg
const ESTIMATED_PLANK_SECONDS = 30;

// An untested Pattern's Reference Strength. Each tested kg Pattern says how strong the user is next to the typical
// Reference Strength for their weight and gender; the untested Pattern gets its typical value at the average of those
// shares (the typical value itself when none was tested), less ESTIMATE_SHARE. A load-limited test counts at its floor
function estimateReferenceStrength(
  pattern: TestedPattern,
  tests: Partial<Record<TestedPattern, AssessmentTest>>,
  bodyProfile: BodyProfile,
) {
  if (pattern === "core") return ESTIMATED_PLANK_SECONDS;
  const shares = KG_PATTERNS.flatMap((tested) => {
    const test = tests[tested];
    return test ? [test.referenceStrength / typicalReferenceStrength(bodyProfile, tested)] : [];
  });
  const share = shares.length ? shares.reduce((sum, s) => sum + s, 0) / shares.length : 1;
  return typicalReferenceStrength(bodyProfile, pattern) * share * ESTIMATE_SHARE;
}

// Turns a pair of Assessment Workouts into the Assessment and the Working Levels it sets. Each Workout is read only
// for the Patterns it tests. The Working Levels cover every Exercise available in any of the user's Equipment Profiles
export function assess(
  a: Workout,
  b: Workout,
  profile: BodyProfile,
  equipmentProfiles: ProfileWithLoads[],
): { assessment: Omit<Assessment, "id" | "createdAt">; workingLevels: WorkingLevel[] } {
  const tests: Partial<Record<TestedPattern, AssessmentTest>> = {};
  for (const [workout, part] of [
    [a, "A"],
    [b, "B"],
  ] as const) {
    for (const { slug, sets } of workout.workoutExercises) {
      const pattern = testedPatternOf(slug);
      const top = topSetOf(sets);
      if (!pattern || !ASSESSMENT_PATTERNS[part].includes(pattern) || !top) continue;
      const { topSet, loadLimited } = top;
      const maximum = maximumOf(slug, topSet, profile.weightKg);
      tests[pattern] = {
        slug,
        topSet,
        maximum,
        loadLimited,
        referenceStrength: referenceStrength(slug, maximum),
        estimated: false,
      };
    }
  }
  const patterns: Assessment["patterns"] = Object.fromEntries(
    TestedPattern.options.map((pattern): [TestedPattern, AssessmentPattern] => [
      pattern,
      tests[pattern] ?? { referenceStrength: estimateReferenceStrength(pattern, tests, profile), estimated: true },
    ]),
  );
  const referenceStrengths: Partial<Record<TestedPattern, number>> = Object.fromEntries(
    Object.entries(patterns).map(([pattern, result]) => [pattern, result.referenceStrength]),
  );
  return {
    assessment: {
      aWorkoutId: a.id,
      bWorkoutId: b.id,
      bStartedAt: b.startedAt,
      bodyWeightKg: profile.weightKg,
      patterns,
    },
    workingLevels: seedWorkingLevels({ referenceStrengths, bodyWeightKg: profile.weightKg, equipmentProfiles }),
  };
}
