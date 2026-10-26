import type { AssessmentPart, EquipmentProfile, Exercise, InjuryTag, TestedPattern } from "@fit/shared";
import { EXERCISES } from "./data/exercises";
import { isAvailable, isSafeFor } from "./equipment";

// The Patterns each Assessment Workout tests, in the order its tests are done
export const ASSESSMENT_PATTERNS: Record<AssessmentPart, TestedPattern[]> = {
  A: ["squat", "hinge", "core"],
  B: ["push", "pull"],
};

// Each Pattern's candidate tests, best first: two-sided weighted lifts, then the rest, ending with one that needs no
// equipment. Band Exercises are never tests
const RANKED: Record<TestedPattern, string[]> = {
  squat: ["back-squat", "goblet-squat", "bodyweight-squat"],
  hinge: ["deadlift", "barbell-romanian-deadlift", "dumbbell-romanian-deadlift", "single-leg-glute-bridge"],
  push: ["barbell-bench-press", "dumbbell-bench-press", "dumbbell-floor-press", "push-up"],
  pull: ["pull-up", "one-arm-dumbbell-row", "inverted-row"],
  core: ["plank"],
};

// The Pattern an Exercise is a test for, or undefined when it's on no Pattern's list
export function testedPatternOf(slug: string): TestedPattern | undefined {
  return (Object.keys(RANKED) as TestedPattern[]).find((pattern) => RANKED[pattern].includes(slug));
}

const bySlug = new Map(EXERCISES.map((exercise) => [exercise.slug, exercise]));
const exerciseBySlug = (slug: string) => {
  const exercise = bySlug.get(slug);
  if (!exercise) throw new Error(`No Exercise "${slug}" in the library`);
  return exercise;
};

// One test Exercise per tested Pattern from the Equipment Profile: the first on its list that's available and safe,
// or null when none is
export function chooseTests(
  equipmentProfile: Pick<EquipmentProfile, "tags">,
  injuries: InjuryTag[],
): Record<TestedPattern, Exercise | null> {
  const choose = (slugs: string[]) =>
    slugs
      .map(exerciseBySlug)
      .find((exercise) => isAvailable(exercise, equipmentProfile) && isSafeFor(exercise, injuries)) ?? null;
  return {
    squat: choose(RANKED.squat),
    hinge: choose(RANKED.hinge),
    push: choose(RANKED.push),
    pull: choose(RANKED.pull),
    core: choose(RANKED.core),
  };
}
