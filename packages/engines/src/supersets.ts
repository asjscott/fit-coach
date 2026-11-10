import type { Exercise, InProgressWorkoutExercise, Pattern } from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";
import { TYPICAL_SECONDS_PER_SET } from "./workout-length";

// Supersets (#96): two Exercises done in turn, a Set of one then a Set of the other with no rest between, and a rest
// only after the pair. The phone pairs them in daysWorkout, only when a Workout would otherwise lose Sets to its
// Length, so the stored plan is unchanged (ADR 0003)

// The Patterns that don't compete, by each Exercise's main Pattern: push with pull, squat with core, hinge with push
const GOES_WITH: Record<Pattern, readonly Pattern[]> = {
  push: ["pull", "hinge"],
  pull: ["push"],
  squat: ["core"],
  core: ["squat"],
  hinge: ["push"],
  carry: [],
};

// The time a round takes over the longer Set: moving between the two Exercises
const CHANGEOVER_SECONDS = 30;

// The Pattern it credits most, the first listed on a tie
const mainPattern = ({ patterns }: Pick<Exercise, "patterns">) =>
  patterns.reduce<(typeof patterns)[number] | undefined>(
    (main, pattern) => (main && main.credit >= pattern.credit ? main : pattern),
    undefined,
  )?.pattern;

// Never a one-sided Exercise, as its Sets are per side, nor a Ballistic one, which goes first while fresh. An Exercise
// this app version doesn't know stays unpaired
function pairablePattern(slug: string) {
  const exercise = exerciseBySlug(slug);
  if (!exercise || exercise.unilateral || exercise.ballistic) return undefined;
  return mainPattern(exercise);
}

export function canPair(a: string, b: string) {
  const first = pairablePattern(a);
  const second = pairablePattern(b);
  return !!first && !!second && GOES_WITH[first].includes(second);
}

export const secondsPerSetOf = (slug: string) => exerciseBySlug(slug)?.secondsPerSet ?? TYPICAL_SECONDS_PER_SET;

// The pair's time: Sets × (the longer Set + 30 s) for the rounds they share, and any Sets one has over the other at
// its own pace
export function pairSeconds(a: { slug: string; sets: number }, b: { slug: string; sets: number }) {
  const rounds = Math.min(a.sets, b.sets);
  const longer = Math.max(secondsPerSetOf(a.slug), secondsPerSetOf(b.slug));
  return (
    rounds * (longer + CHANGEOVER_SECONDS) +
    (a.sets - rounds) * secondsPerSetOf(a.slug) +
    (b.sets - rounds) * secondsPerSetOf(b.slug)
  );
}

// On the In-progress Workout a pair is linked both ways by planned.supersetWith, so it lasts only while both are there
type PairMember = Pick<InProgressWorkoutExercise, "id" | "planned"> & { sets: readonly unknown[] };

// The Workout Exercise this one is paired with, while both are in the Workout
export const supersetPartner = <T extends PairMember>(workoutExercises: readonly T[], workoutExercise: PairMember) =>
  workoutExercises.find(
    ({ id, planned }) => id === workoutExercise.planned?.supersetWith && planned?.supersetWith === workoutExercise.id,
  );

// The Workout's Exercises as the logging screen shows them: a pair together where its first Exercise is, however the
// user has moved them, and every other Exercise on its own
export function supersetGroups<T extends PairMember>(workoutExercises: readonly T[]): T[][] {
  const grouped = new Set<T>();
  return workoutExercises.flatMap((workoutExercise) => {
    if (grouped.has(workoutExercise)) return [];
    const partner = supersetPartner(workoutExercises, workoutExercise);
    if (partner) grouped.add(partner);
    return [partner ? [workoutExercise, partner] : [workoutExercise]];
  });
}

const hasSetsLeft = ({ sets, planned }: PairMember) => sets.length < (planned?.sets ?? Number.POSITIVE_INFINITY);

// Whose turn it is in a pair: of those with Sets left, the one with fewer logged, the first on a tie. None once both
// have all their Sets
export const supersetTurn = <T extends PairMember>(pair: readonly T[]): T | undefined =>
  pair
    .filter(hasSetsLeft)
    .reduce<T | undefined>(
      (turn, member) => (turn && turn.sets.length <= member.sets.length ? turn : member),
      undefined,
    );
