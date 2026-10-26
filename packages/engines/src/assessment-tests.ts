import {
  TestedPattern,
  type AssessmentPart,
  type EquipmentProfile,
  type Exercise,
  type InjuryTag,
  type Pattern,
} from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";
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

// The tested Pattern whose Reference Strength a Pattern's Working Levels follow from: carry has no test, so hinge
export const referencePatternOf = (pattern: Pattern): TestedPattern => (pattern === "carry" ? "hinge" : pattern);

// The Pattern an Exercise is a test for, or undefined when it's on no Pattern's list
export function testedPatternOf(slug: string): TestedPattern | undefined {
  return (Object.keys(RANKED) as TestedPattern[]).find((pattern) => RANKED[pattern].includes(slug));
}

const libraryExercise = (slug: string) => {
  const exercise = exerciseBySlug(slug);
  if (!exercise) throw new Error(`No Exercise "${slug}" in the library`);
  return exercise;
};

// One test Exercise per tested Pattern from the Equipment Profile: the first on its list that's available and safe,
// or null when none is
export function chooseTests(
  equipmentProfile: Pick<EquipmentProfile, "tags">,
  injuries: InjuryTag[],
): Record<TestedPattern, Exercise | null> {
  const choose = (pattern: TestedPattern) =>
    RANKED[pattern]
      .map(libraryExercise)
      .find((exercise) => isAvailable(exercise, equipmentProfile) && isSafeFor(exercise, injuries)) ?? null;
  return Object.fromEntries(TestedPattern.options.map((pattern) => [pattern, choose(pattern)])) as Record<
    TestedPattern,
    Exercise | null
  >;
}
