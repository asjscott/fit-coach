import type { InProgressWorkout, InProgressWorkoutExercise } from "@fit/shared";
import { takesOneSet, type LoggedWorkoutExercise } from "./recovery-workout";
import { secondsPerSetOf, supersetPartner } from "./supersets";

// The rest after a Set (#95): what's left of the Set's time once the Set itself is done, but never under 45 seconds
const SET_SECONDS = 30;
const SHORTEST_REST_SECONDS = 45;
export const REST_EXTENSION_SECONDS = 15;

// A countdown to a fixed end time (ms since the epoch), so it stays right while the app is in the background
export type Rest = { endsAt: number };

// The same for every Goal, one-sided Exercises and Assessment test Sets alike
export const restSeconds = (secondsPerSet: number) => Math.max(SHORTEST_REST_SECONDS, secondsPerSet - SET_SECONDS);

// The rest after a Set of this Exercise on its own; an Exercise this app version doesn't know rests the typical time
export const exerciseRestSeconds = (slug: string) => restSeconds(secondsPerSetOf(slug));

// The rest after a Set of this Exercise logged now
export const startRest = (slug: string, now: Date): Rest => ({
  endsAt: now.getTime() + exerciseRestSeconds(slug) * 1000,
});

// The rest after a Set of a Workout Exercise just logged (#96). In a superset there's none while the other Exercise
// is behind and has Sets left, as the user goes straight to it, and after the pair's second Set it's the longer of
// the two rests. Once the other has all its Sets, the one left rests as usual. The walk has no rest after it
export function restAfterSet(
  { workoutExercises }: Pick<InProgressWorkout, "workoutExercises">,
  workoutExerciseId: string,
  now: Date,
): Rest | null {
  const logged = workoutExercises.find(({ id }) => id === workoutExerciseId);
  if (!logged || takesOneSet(logged.slug)) return null;
  const partner = supersetPartner(workoutExercises, logged);
  if (!partner) return startRest(logged.slug, now);
  const { pairSeconds, done } = pairRestPlan([logged, partner]);
  if (partner.sets.length < logged.sets.length) return done === partner.slug ? startRest(logged.slug, now) : null;
  return { endsAt: now.getTime() + pairSeconds * 1000 };
}

// The rest after a superset's round: the longer of its two Exercises' rests
export const pairRestSeconds = (a: string, b: string) => restSeconds(Math.max(secondsPerSetOf(a), secondsPerSetOf(b)));

type PairMember = LoggedWorkoutExercise & Pick<InProgressWorkoutExercise, "planned">;

const isDone = ({ sets, planned }: PairMember) => !!planned && sets.length >= planned.sets;

export type PairRestPlan = {
  // After each round both are in
  pairSeconds: number;
  // The one with fewer Sets planned, and the other's own rest for once it's done; none when they have as many
  fewer?: { slug: string; otherSeconds: number };
  // The one with all its Sets whose last round is over, so the other rests its own time
  done?: string;
};

// A superset's rests, as restAfterSet gives them and the superset box words them (#111)
export function pairRestPlan(pair: readonly [PairMember, PairMember]): PairRestPlan {
  const [first, second] = pair;
  const plannedSets = ({ planned }: PairMember) => planned?.sets ?? 0;
  const [fewer, more] = plannedSets(first) <= plannedSets(second) ? [first, second] : [second, first];
  const done = [fewer, more].find(
    (member) => isDone(member) && (member === fewer ? more : fewer).sets.length >= member.sets.length,
  );
  return {
    pairSeconds: pairRestSeconds(first.slug, second.slug),
    ...(plannedSets(fewer) < plannedSets(more) && {
      fewer: { slug: fewer.slug, otherSeconds: exerciseRestSeconds(more.slug) },
    }),
    ...(done && { done: done.slug }),
  };
}

export const extendRest = (rest: Rest): Rest => ({ endsAt: rest.endsAt + REST_EXTENSION_SECONDS * 1000 });

// Whole seconds left, rounded up so it reads 0 only once the rest is over
export const restSecondsLeft = (rest: Rest, now: Date) => Math.max(0, Math.ceil((rest.endsAt - now.getTime()) / 1000));
