import { MAX_ALTERNATIVE_OPTIONS } from "@fit/shared";
import type { BuiltInEquipment, Exercise, PlannedExercise, SetTarget } from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";
import { isJump } from "./jumps";

// An Exercise the user can be given, with its target on the equipment it was worked out for
export type Candidate = { exercise: Exercise; target: SetTarget };

// One built-in choice's Exercises. possible decides what stays; pickable, what's left of it after the plan's guards, is
// what can stand in, as the guards are about what the Coach gives next and not what the equipment allows
export type ChoiceCandidates = { possible: readonly Candidate[]; pickable: readonly Candidate[] };

const sharedPrimaryMuscles = (a: Exercise, b: Exercise) =>
  a.muscles.primary.filter((muscle) => b.muscles.primary.includes(muscle)).length;

const sharesPattern = (a: Exercise, b: Exercise) =>
  a.patterns.some(({ pattern }) => b.patterns.some((other) => other.pattern === pattern));

// The best stand-ins for an Exercise, best first: the same Pattern if any share a primary Muscle, else any Pattern.
// The sort is stable, so the candidates' own order settles a tie
export function alternativeOptions(exercise: Exercise, candidates: readonly Candidate[]) {
  // A jump only ever stands in for a jump, and nothing else for a jump (#105)
  const sharing = candidates.filter(
    (candidate) =>
      isJump(candidate.exercise) === isJump(exercise) && sharedPrimaryMuscles(exercise, candidate.exercise) > 0,
  );
  const samePattern = sharing.filter((candidate) => sharesPattern(exercise, candidate.exercise));
  return [...(samePattern.length ? samePattern : sharing)]
    .sort((a, b) => sharedPrimaryMuscles(exercise, b.exercise) - sharedPrimaryMuscles(exercise, a.exercise))
    .slice(0, MAX_ALTERNATIVE_OPTIONS);
}

const asOption = ({ exercise, target }: Candidate) => ({ slug: exercise.slug, target });

// What each planned Exercise becomes on one built-in choice: just itself if it's still possible, else its options,
// which leave out what stays, since an Exercise can't be done twice. Empty when it drops out
function optionsOn(plannedExercises: readonly PlannedExercise[], { possible, pickable }: ChoiceCandidates) {
  const possibleBySlug = new Map(possible.map((candidate) => [candidate.exercise.slug, candidate]));
  const stays = new Set(plannedExercises.flatMap(({ slug }) => (possibleBySlug.has(slug) ? [slug] : [])));
  const free = pickable.filter(({ exercise }) => !stays.has(exercise.slug));
  return (slug: string) => {
    const itself = possibleBySlug.get(slug);
    if (itself) return [asOption(itself)];
    const exercise = exerciseBySlug(slug);
    return exercise ? alternativeOptions(exercise, free).map(asOption) : [];
  };
}

// The candidates are per choice, so a choice left out isn't offered on the card
export function withAlternatives(
  plannedExercises: readonly PlannedExercise[],
  candidates: Partial<Record<BuiltInEquipment, ChoiceCandidates>>,
): PlannedExercise[] {
  const options = Object.entries(candidates).map(
    ([choice, onChoice]) => [choice, optionsOn(plannedExercises, onChoice)] as const,
  );
  return plannedExercises.map((plannedExercise) => ({
    ...plannedExercise,
    alternatives: Object.fromEntries(options.map(([choice, optionsOf]) => [choice, optionsOf(plannedExercise.slug)])),
  }));
}
