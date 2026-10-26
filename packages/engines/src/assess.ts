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
import { referenceStrength, STRENGTH_RATIOS } from "./strength-ratios";
import { seedWorkingLevels } from "./working-levels";

// A weighted test's top Set is the first rated RPE 9 or higher. A bodyweight or timed test is a single Set, so its
// top Set is that Set. None means the test has no top Set
const topSetOf = (sets: Set[]) =>
  sets[0]?.kind === "external" ? sets.find((set) => (set.rpe ?? 0) >= TOP_SET_RPE) : sets[0];

// The reps the Set would have reached to failure: reps in reserve count. An unrated Set counts as RPE 9
const repsToFailure = (reps: number, rpe = TOP_SET_RPE) => reps + (10 - rpe);

// The test's maximum: an e1RM in kg, or for a timed test the seconds held.
// - weighted: past 12 reps Epley isn't trusted, so the estimate stops there as a floor.
// - bodyweight: the load is body weight × the Exercise's share. Epley runs uncapped here, because a bodyweight
//   Working Level inverts the same formula: the tested Exercise's rep target comes back as its rep maximum less the
//   reps in reserve, however many reps the test reached.
function maximumOf(slug: string, set: Set, bodyWeightKg: number) {
  switch (set.kind) {
    case "external":
      return e1rm(set.kg, Math.min(repsToFailure(set.reps, set.rpe), MAX_E1RM_REPS));
    case "bodyweight": {
      const entry = STRENGTH_RATIOS[slug];
      if (entry?.kind !== "bodyweight") throw new Error(`"${slug}" isn't a bodyweight Exercise`);
      return bodyWeightKg * entry.share * (1 + repsToFailure(set.reps, set.rpe) / 30);
    }
    case "timed":
      return set.seconds;
  }
}

// Turns a pair of Assessment Workouts into the Assessment and the Working Levels it sets. Each Workout is read only
// for the Patterns it tests.
// The Working Levels cover every Exercise available in any of the user's Equipment Profiles.
// Still to come: load-limited and untested Patterns (#38)
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
      const maximum = maximumOf(slug, topSet, profile.weightKg);
      patterns[pattern] = {
        slug,
        topSet,
        maximum,
        referenceStrength: referenceStrength(slug, maximum),
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
