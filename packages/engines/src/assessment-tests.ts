import {
  AssessmentPart,
  TestedPattern,
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

// Each Pattern's candidate tests, best first: two-sided weighted lifts, then the rest, ending with the one needing
// the least equipment: nothing at all, but a bar or a table for pull. Band Exercises are never tests
const CANDIDATE_TESTS: Record<TestedPattern, string[]> = {
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
  return (Object.keys(CANDIDATE_TESTS) as TestedPattern[]).find((pattern) => CANDIDATE_TESTS[pattern].includes(slug));
}

// Every candidate is in the library, so a missing one is a bug in the lists
const requireExercise = (slug: string) => {
  const exercise = exerciseBySlug(slug);
  if (!exercise) throw new Error(`No Exercise "${slug}" in the library`);
  return exercise;
};

// Each tested Pattern's test Exercise, or null when none is available and safe
export type ChosenTests = Record<TestedPattern, Exercise | null>;

// One test Exercise per tested Pattern from the Equipment Profile: the first on its list that's available and safe,
// or null when none is
export function chooseTests(equipmentProfile: Pick<EquipmentProfile, "tags">, injuries: InjuryTag[]): ChosenTests {
  const choose = (pattern: TestedPattern) =>
    CANDIDATE_TESTS[pattern]
      .map(requireExercise)
      .find((exercise) => isAvailable(exercise, equipmentProfile) && isSafeFor(exercise, injuries)) ?? null;
  return Object.fromEntries(TestedPattern.options.map((pattern) => [pattern, choose(pattern)])) as ChosenTests;
}

// Assessment Workout A or B's tests in order, and its Patterns with no test, which the Assessment estimates
export function partTests(tests: ChosenTests, part: AssessmentPart) {
  const patterns = ASSESSMENT_PATTERNS[part];
  return {
    exercises: patterns.flatMap((pattern) => tests[pattern] ?? []),
    untested: patterns.filter((pattern) => !tests[pattern]),
  };
}

// Whether both Assessment Workouts have a test to do: with none for A or for B there would never be an Assessment
export const canAssess = (tests: ChosenTests) =>
  AssessmentPart.options.every((part) => partTests(tests, part).exercises.length > 0);
