import type { InProgressWorkout } from "@fit/shared";
import { secondsPerSetOf, supersetPartner } from "./supersets";

// The rest after a Set (#95): what's left of the Set's time once the Set itself is done, but never under 45 seconds
const SET_SECONDS = 30;
const SHORTEST_REST_SECONDS = 45;
export const REST_EXTENSION_SECONDS = 15;

// A countdown to a fixed end time (ms since the epoch), so it stays right while the app is in the background
export type Rest = { endsAt: number };

// The same for every Goal, one-sided Exercises and Assessment test Sets alike
export const restSeconds = (secondsPerSet: number) => Math.max(SHORTEST_REST_SECONDS, secondsPerSet - SET_SECONDS);

// The rest after a Set of this Exercise logged now; an Exercise this app version doesn't know rests the typical time
export const startRest = (slug: string, now: Date): Rest => ({
  endsAt: now.getTime() + restSeconds(secondsPerSetOf(slug)) * 1000,
});

// The rest after a Set of a Workout Exercise just logged (#96). In a superset there's none while the other Exercise
// is behind and has Sets left, as the user goes straight to it, and after the pair's second Set it's the longer of
// the two rests. Once the other has all its Sets, the one left rests as usual
export function restAfterSet(
  { workoutExercises }: Pick<InProgressWorkout, "workoutExercises">,
  workoutExerciseId: string,
  now: Date,
): Rest | null {
  const logged = workoutExercises.find(({ id }) => id === workoutExerciseId);
  if (!logged) return null;
  const partner = supersetPartner(workoutExercises, logged);
  const behind = partner && partner.sets.length < logged.sets.length;
  if (!partner || (behind && partner.sets.length >= (partner.planned?.sets ?? 0))) return startRest(logged.slug, now);
  if (behind) return null;
  const longer = Math.max(secondsPerSetOf(logged.slug), secondsPerSetOf(partner.slug));
  return { endsAt: now.getTime() + restSeconds(longer) * 1000 };
}

export const extendRest = (rest: Rest): Rest => ({ endsAt: rest.endsAt + REST_EXTENSION_SECONDS * 1000 });

// Whole seconds left, rounded up so it reads 0 only once the rest is over
export const restSecondsLeft = (rest: Rest, now: Date) => Math.max(0, Math.ceil((rest.endsAt - now.getTime()) / 1000));
