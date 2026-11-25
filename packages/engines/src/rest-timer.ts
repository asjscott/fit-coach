import type { InProgressWorkout, InProgressWorkoutExercise } from "@fit/shared";
import { takesOneSet, type LoggedWorkoutExercise } from "./recovery-workout";
import { restSeconds, type RestChoice } from "./rest-choice";
import { secondsPerSetOf, supersetPartner } from "./supersets";

// What −15 s and +15 s move the current rest's end by
export const REST_ADJUSTMENT_SECONDS = 15;

// A countdown to a fixed end time (ms since the epoch), so it stays right while the app is in the background
export type Rest = { endsAt: number };

// The rest after a Set of this Exercise on its own; an Exercise this app version doesn't know rests the typical time
export const exerciseRestSeconds = (slug: string, choice?: RestChoice) => restSeconds(secondsPerSetOf(slug), choice);

// The rest after a Set of this Exercise logged now
export const startRest = (slug: string, now: Date, choice?: RestChoice): Rest => ({
  endsAt: now.getTime() + exerciseRestSeconds(slug, choice) * 1000,
});

// The rest after a Set of a Workout Exercise just logged (#96). In a superset there's none while the other Exercise
// is behind and has Sets left, as the user goes straight to it, and after the pair's second Set it's the longer of
// the two rests. Once the other has all its Sets, the one left rests as usual. The walk has no rest after it, and
// nor does a Set of a Workout logged afterwards, which happened on another day (#153). An Assessment always rests as on
// Auto, so its tests aren't held back by tiredness (#178). The Workout's last planned Set has none (#180)
export function restAfterSet(
  { workoutExercises, pastStart, assessment }: Pick<InProgressWorkout, "workoutExercises" | "pastStart" | "assessment">,
  workoutExerciseId: string,
  now: Date,
  chosen: RestChoice = "auto",
): Rest | null {
  if (pastStart) return null;
  const choice = assessment ? "auto" : chosen;
  const logged = workoutExercises.find(({ id }) => id === workoutExerciseId);
  if (!logged || takesOneSet(logged.slug) || isLastPlannedSet(workoutExercises, logged)) return null;
  const partner = supersetPartner(workoutExercises, logged);
  if (!partner) return startRest(logged.slug, now, choice);
  const { pairSeconds, done } = pairRestPlan([logged, partner], choice);
  if (partner.sets.length < logged.sets.length)
    return done === partner.slug ? startRest(logged.slug, now, choice) : null;
  return { endsAt: now.getTime() + pairSeconds * 1000 };
}

// The rest after a superset's round: the longer of its two Exercises' rests
export const pairRestSeconds = (a: string, b: string, choice?: RestChoice) =>
  restSeconds(Math.max(secondsPerSetOf(a), secondsPerSetOf(b)), choice);

type PairMember = LoggedWorkoutExercise & Pick<InProgressWorkoutExercise, "planned">;

const isDone = ({ sets, planned }: PairMember) => !!planned && sets.length >= planned.sets;

// Whether the Set just logged finished the plan. One past an Exercise's planned Sets didn't
const isLastPlannedSet = (workoutExercises: readonly PairMember[], { sets, planned }: PairMember) =>
  !!planned && sets.length <= planned.sets && workoutExercises.every((member) => !member.planned || isDone(member));

export type PairRestPlan = {
  // After each round both are in
  pairSeconds: number;
  // The one with fewer Sets planned, and the other's own rest for once it's done; none when they have as many
  fewer?: { slug: string; otherSeconds: number };
  // The one with all its Sets whose last round is over, so the other rests its own time
  done?: string;
};

// A superset's rests, as restAfterSet gives them and the superset box words them (#111)
export function pairRestPlan(pair: readonly [PairMember, PairMember], choice?: RestChoice): PairRestPlan {
  const [first, second] = pair;
  const plannedSets = ({ planned }: PairMember) => planned?.sets ?? 0;
  const [fewer, more] = plannedSets(first) <= plannedSets(second) ? [first, second] : [second, first];
  const done = [fewer, more].find(
    (member) => isDone(member) && (member === fewer ? more : fewer).sets.length >= member.sets.length,
  );
  return {
    pairSeconds: pairRestSeconds(first.slug, second.slug, choice),
    ...(plannedSets(fewer) < plannedSets(more) && {
      fewer: { slug: fewer.slug, otherSeconds: exerciseRestSeconds(more.slug, choice) },
    }),
    ...(done && { done: done.slug }),
  };
}

// Moves the current rest's end, earlier when negative; null when that ends it. The next rest is its usual length
export function adjustRest<T extends Rest>(rest: T, seconds: number, now: Date): T | null {
  const endsAt = rest.endsAt + seconds * 1000;
  return endsAt > now.getTime() ? { ...rest, endsAt } : null;
}

// Whole seconds left, rounded up so it reads 0 only once the rest is over
export const restSecondsLeft = (rest: Rest, now: Date) => Math.max(0, Math.ceil((rest.endsAt - now.getTime()) / 1000));

// The countdown alerts as it turns to each of these, and to zero
const ALERT_SECONDS = 3;

// A rest that ended this long ago, while the app was in the background, ends without an alert on return
const LATE_REST_END_MS = 2000;

// What happens to a rest between one look at it and the next: whether it's over, and whether to beep and vibrate, once
// for each of the last seconds and at zero (#179)
export function restStep(rest: Rest, before: Date, now: Date): { ended: boolean; alerts: boolean } {
  const left = restSecondsLeft(rest, now);
  const ended = left === 0;
  const turned = left < restSecondsLeft(rest, before);
  const late = ended && now.getTime() - rest.endsAt >= LATE_REST_END_MS;
  return { ended, alerts: turned && left <= ALERT_SECONDS && !late };
}
