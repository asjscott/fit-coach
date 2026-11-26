import type { InProgressWorkout, InProgressWorkoutExercise } from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";
import { targetRange, type TargetRange } from "./target-range";

// The time of a hold, worked out from when it began, its pauses and now. Nothing counts ticks, so it stays right while
// the app is in the background. The hold timer of a strength Exercise and the guided flow share it (#195)

export const HOLD_LEAD_IN_SECONDS = 5;

export type Hold = {
  // To get into position before each side, so also what there is to switch sides
  leadInSeconds: number;
  sides: 1 | 2;
} & (
  | // Goes on past its target until the user stops it; none only counts up. A max that isn't past the min is one target
    { ends: "on-stop"; target: TargetRange | null }
    // Ends by itself after the target's min on each side
  | { ends: "at-target"; target: TargetRange }
);

// When a hold began, in ms since the epoch, and its pauses, oldest first; the last has no `to` while paused
export type HoldRun = { startedAt: number; pauses: readonly { from: number; to?: number }[] };

export type HoldState = {
  // "over" is past the bottom of the target, or with no target, still holding; "done" is a hold that ended by itself
  phase: "lead-in" | "hold" | "over" | "done";
  side: 1 | 2;
  // Of the lead-in, or to the bottom of the target; rounded up so it reads 0 only once it's over. 0 in the others
  secondsLeft: number;
  // On this side, rounded down
  secondsHeld: number;
  // At or past the top of a range
  atTop: boolean;
};

// "start" as each side's hold begins, the lead-in over. A hold until Stop cues the bottom and top of its target; one
// that ends at it cues its last 3 seconds, each, and its end
export type HoldCue = { cue: "start" | "bottom" | "top" | "last-seconds" | "end"; side: 1 | 2 };

const LAST_SECONDS = [3, 2, 1];

// A cue this long past, while the app was in the background, isn't given on return
const LATE_CUE_MS = 2000;

export const isHoldPaused = ({ pauses }: HoldRun) => {
  const last = pauses.at(-1);
  return !!last && last.to === undefined;
};

export const pauseHold = (run: HoldRun, now: Date): HoldRun =>
  isHoldPaused(run) ? run : { ...run, pauses: [...run.pauses, { from: now.getTime() }] };

export const resumeHold = (run: HoldRun, now: Date): HoldRun =>
  isHoldPaused(run)
    ? { ...run, pauses: run.pauses.map((pause) => ({ ...pause, to: pause.to ?? now.getTime() })) }
    : run;

// How long it has run, its pauses left out
function elapsedMs({ startedAt, pauses }: HoldRun, now: Date): number {
  const at = now.getTime();
  const paused = pauses.reduce((sum, { from, to = at }) => sum + Math.max(0, Math.min(to, at) - from), 0);
  return Math.max(0, at - startedAt - paused);
}

// Which side it's on and the time into that side's lead-in and hold
function sideAt(hold: Hold, elapsed: number): { side: 1 | 2; ms: number } {
  if (hold.ends !== "at-target" || hold.sides === 1) return { side: 1, ms: elapsed };
  const sideMs = (hold.leadInSeconds + hold.target.min) * 1000;
  return elapsed < sideMs ? { side: 1, ms: elapsed } : { side: 2, ms: elapsed - sideMs };
}

const topOf = (target: TargetRange | null) =>
  target?.max !== undefined && target.max > target.min ? target.max : undefined;

const secondsUp = (ms: number) => Math.ceil(ms / 1000);

export function holdState(hold: Hold, run: HoldRun, now: Date): HoldState {
  const { side, ms } = sideAt(hold, elapsedMs(run, now));
  const heldMs = ms - hold.leadInSeconds * 1000;
  const state = { side, secondsLeft: 0, secondsHeld: Math.max(0, Math.floor(heldMs / 1000)), atTop: false };
  if (heldMs < 0) return { ...state, phase: "lead-in", secondsLeft: secondsUp(-heldMs) };
  const bottomMs = (hold.target?.min ?? 0) * 1000;
  if (heldMs < bottomMs) return { ...state, phase: "hold", secondsLeft: secondsUp(bottomMs - heldMs) };
  if (hold.ends === "at-target") return { ...state, phase: "done", secondsHeld: hold.target.min };
  const top = topOf(hold.target);
  return { ...state, phase: "over", atTop: top !== undefined && heldMs >= top * 1000 };
}

// Every cue of the hold, with how long into it it's due
function allCues({ leadInSeconds, ...hold }: Hold): (HoldCue & { atMs: number })[] {
  const cue = (name: HoldCue["cue"], side: 1 | 2, seconds: number) => ({ cue: name, side, atMs: seconds * 1000 });
  if (hold.ends === "on-stop") {
    const top = topOf(hold.target);
    return [
      cue("start", 1, leadInSeconds),
      ...(hold.target ? [cue("bottom", 1, leadInSeconds + hold.target.min)] : []),
      ...(top === undefined ? [] : [cue("top", 1, leadInSeconds + top)]),
    ];
  }
  const { min } = hold.target;
  return ([1, 2] as const).slice(0, hold.sides).flatMap((side) => {
    const start = leadInSeconds * side + min * (side - 1);
    const last = LAST_SECONDS.filter((left) => left < min).map((left) => cue("last-seconds", side, start + min - left));
    return [cue("start", side, start), ...last, cue("end", side, start + min)];
  });
}

// The cues that fall due between one look at the hold and the next
export function holdCues(hold: Hold, run: HoldRun, before: Date, now: Date): HoldCue[] {
  const [from, to] = [elapsedMs(run, before), elapsedMs(run, now)];
  return allCues(hold)
    .filter(({ atMs }) => atMs > from && atMs <= to && to - atMs < LATE_CUE_MS)
    .map(({ cue, side }) => ({ cue, side }));
}

// What Stop fills in: the seconds held, to the nearest whole one
export function finishedHoldSeconds(hold: Hold, run: HoldRun, now: Date): number {
  const { ms } = sideAt(hold, elapsedMs(run, now));
  return Math.max(0, Math.round(ms / 1000 - hold.leadInSeconds));
}

// The hold a Set of this Workout Exercise is timed as, or null when it isn't timed or is a Recovery Exercise's. One
// hold for a one-sided Exercise too, as its Set records one side. A test in an Assessment has no target, and a deload
// week's is one number
export function strengthHold(
  { slug, loadType, planned }: Pick<InProgressWorkoutExercise, "slug" | "loadType" | "planned">,
  { assessment, deloadWeek }: Pick<InProgressWorkout, "assessment" | "deloadWeek">,
): Hold | null {
  const exercise = exerciseBySlug(slug);
  if (loadType !== "timed" || !exercise || exercise.recovery) return null;
  const aim = planned?.target;
  const range =
    assessment || aim?.unit !== "seconds"
      ? null
      : ((deloadWeek ? null : targetRange(exercise, aim)) ?? { min: aim.seconds });
  return { leadInSeconds: HOLD_LEAD_IN_SECONDS, sides: 1, ends: "on-stop", target: range };
}
