import { TestedPattern, type Exercise, type InjuryTag, type Pattern, type Set } from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";
import { isAvailable, isSafeFor, type ProfileWithLoads } from "./equipment";

// The Patterns the Assessment Workout tests, in the order its tests are done: each follows one for the other half of
// the body
export const ASSESSMENT_PATTERNS: TestedPattern[] = ["squat", "push", "hinge", "pull", "core"];

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
export function chooseTests(
  { tags, loads = {} }: Pick<ProfileWithLoads, "tags"> & Partial<ProfileWithLoads>,
  injuries: InjuryTag[],
): ChosenTests {
  const choose = (pattern: TestedPattern) =>
    CANDIDATE_TESTS[pattern]
      .map(requireExercise)
      .find((exercise) => isAvailable(exercise, { tags, loads }) && isSafeFor(exercise, injuries)) ?? null;
  return Object.fromEntries(TestedPattern.options.map((pattern) => [pattern, choose(pattern)])) as ChosenTests;
}

// The Assessment Workout's tests in order, and the Patterns with no test, which the Assessment estimates
export const assessmentTests = (tests: ChosenTests) => ({
  exercises: ASSESSMENT_PATTERNS.flatMap((pattern) => tests[pattern] ?? []),
  untested: ASSESSMENT_PATTERNS.filter((pattern) => !tests[pattern]),
});

// A user who can't do a pull-up measures pull with this instead
const PULL_UP_SWAP = "inverted-row";

// The test a pull-up test with no Set logged can be swapped for: the inverted row, when it's available and safe
export function testSwap(
  { slug, sets }: { slug: string; sets: readonly Set[] },
  profile: ProfileWithLoads,
  injuries: InjuryTag[],
): Exercise | undefined {
  if (slug !== "pull-up" || sets.length > 0) return undefined;
  const swap = requireExercise(PULL_UP_SWAP);
  return isAvailable(swap, profile) && isSafeFor(swap, injuries) ? swap : undefined;
}

// Whether any Pattern has a test to do: one is enough, as the others are estimated
export const canAssess = (tests: ChosenTests) => assessmentTests(tests).exercises.length > 0;
