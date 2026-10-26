import type { Assessment, AssessmentTest, Set, UserProfile, WorkingLevel, Workout } from "@fit/shared";
import { TOP_SET_RPE } from "./assessment-protocol";
import { ASSESSMENT_PATTERNS, testedPatternOf } from "./assessment-tests";
import { e1rm, MAX_E1RM_REPS } from "./e1rm";

// A Working Level in kg is for 8 reps with 2 in reserve, so it's the load whose e1rm at 10 reps is the maximum
const WORKING_LEVEL_E1RM_REPS = 10;

type RatedSet = Extract<Set, { kind: "external" }> & { rpe: number };

// The first Set rated RPE 9 or higher; none means the test has no top Set
const topSetOf = (sets: Set[]) =>
  sets.find((set): set is RatedSet => set.kind === "external" && (set.rpe ?? 0) >= TOP_SET_RPE);

// Reps in reserve count. Past 12 reps Epley isn't trusted, so the estimate stops there as a floor
const maximumOf = ({ kg, reps, rpe }: RatedSet) => e1rm(kg, Math.min(reps + (10 - rpe), MAX_E1RM_REPS));

// Turns a pair of Assessment Workouts into the Assessment and the Working Levels it sets. Each Workout is read only
// for the Patterns it tests.
// Still to come: Reference Strengths and Working Levels for every available Exercise from the Equipment Profiles
// (#36), bodyweight and timed tests (#37), load-limited and untested Patterns (#38)
export function assess(
  a: Workout,
  b: Workout,
  profile: Pick<UserProfile, "weightKg">,
): { assessment: Omit<Assessment, "id" | "createdAt">; workingLevels: WorkingLevel[] } {
  const patterns: Assessment["patterns"] = {};
  for (const [workout, part] of [
    [a, "A"],
    [b, "B"],
  ] as const) {
    for (const { slug, sets } of workout.workoutExercises) {
      const pattern = testedPatternOf(slug);
      const topSet = topSetOf(sets);
      if (!pattern || !ASSESSMENT_PATTERNS[part].includes(pattern) || !topSet) continue;
      patterns[pattern] = { slug, topSet, maximumKg: maximumOf(topSet), estimated: false } satisfies AssessmentTest;
    }
  }
  const workingLevels = Object.values(patterns).map(({ slug, maximumKg }): WorkingLevel => ({
    slug,
    unit: "kg",
    kg: maximumKg / (1 + WORKING_LEVEL_E1RM_REPS / 30),
  }));
  return {
    assessment: { aWorkoutId: a.id, bWorkoutId: b.id, bodyWeightKg: profile.weightKg, patterns },
    workingLevels,
  };
}
