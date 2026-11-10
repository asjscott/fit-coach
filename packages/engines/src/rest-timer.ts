import { exerciseBySlug } from "./data/exercises";
import { TYPICAL_SECONDS_PER_SET } from "./workout-length";

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
  endsAt: now.getTime() + restSeconds(exerciseBySlug(slug)?.secondsPerSet ?? TYPICAL_SECONDS_PER_SET) * 1000,
});

// +15 s, for this rest only
export const extendRest = (rest: Rest): Rest => ({ endsAt: rest.endsAt + REST_EXTENSION_SECONDS * 1000 });

// Whole seconds left, rounded up so it reads 0 only once the rest is over
export const restSecondsLeft = (rest: Rest, now: Date) => Math.max(0, Math.ceil((rest.endsAt - now.getTime()) / 1000));
