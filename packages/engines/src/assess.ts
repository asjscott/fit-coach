import type {
  Assessment,
  AssessmentTest,
  EquipmentProfile,
  Set,
  TestedPattern,
  UserProfile,
  WorkingLevel,
  Workout,
} from "@fit/shared";
import { TOP_SET_RPE } from "./assessment-protocol";
import { ASSESSMENT_PATTERNS, testedPatternOf } from "./assessment-tests";
import { e1rm, MAX_E1RM_REPS } from "./e1rm";
import { seedWorkingLevels } from "./working-levels";
import { referenceStrength } from "./strength-ratios";

type RatedSet = Extract<Set, { kind: "external" }> & { rpe: number };

// The first Set rated RPE 9 or higher; none means the test has no top Set
const topSetOf = (sets: Set[]) =>
  sets.find((set): set is RatedSet => set.kind === "external" && (set.rpe ?? 0) >= TOP_SET_RPE);

// Reps in reserve count. Past 12 reps Epley isn't trusted, so the estimate stops there as a floor
const maximumOf = ({ kg, reps, rpe }: RatedSet) => e1rm(kg, Math.min(reps + (10 - rpe), MAX_E1RM_REPS));

// Turns a pair of Assessment Workouts into the Assessment and the Working Levels it sets. Each Workout is read only
// for the Patterns it tests.
// The Working Levels cover every Exercise available in any of the user's Equipment Profiles.
// Still to come: bodyweight and timed tests (#37), load-limited and untested Patterns (#38)
export function assess(
  a: Workout,
  b: Workout,
  profile: Pick<UserProfile, "weightKg">,
  equipmentProfiles: Pick<EquipmentProfile, "tags" | "loads">[],
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
      const maximumKg = maximumOf(topSet);
      patterns[pattern] = {
        slug,
        topSet,
        maximumKg,
        referenceStrength: referenceStrength(slug, maximumKg),
        estimated: false,
      } satisfies AssessmentTest;
    }
  }
  const referenceStrengths: Partial<Record<TestedPattern, number>> = Object.fromEntries(
    Object.entries(patterns).map(([pattern, test]) => [pattern, test.referenceStrength]),
  );
  return {
    assessment: { aWorkoutId: a.id, bWorkoutId: b.id, bodyWeightKg: profile.weightKg, patterns },
    workingLevels: seedWorkingLevels(referenceStrengths, profile.weightKg, equipmentProfiles),
  };
}
