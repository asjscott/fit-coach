import type { InProgressWorkout, InProgressWorkoutExercise } from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";
import { holdCues, holdState, isHoldPaused, pauseHold, type Hold, type HoldRun } from "./hold-timer";

// The guided flow runs a Recovery Workout's holds one after another, each logging its Set (#200). Where it is comes
// from the logged Sets and the skips of this run of it

// To change position before each hold, and sides within it
export const CHANGE_SECONDS = 10;

// One Set of a Recovery Exercise: its seconds are per side
export type GuidedHold = { workoutExerciseId: string; slug: string; seconds: number; sides: 1 | 2 };

// How many of each Workout Exercise's Sets this run has skipped
export type GuidedSkips = Readonly<Record<string, number>>;

export type GuidedPlace = {
  // null once every hold is logged or skipped
  current: GuidedHold | null;
  next: GuidedHold | null;
  // The current hold's number, or the last's once it's over
  position: number;
  count: number;
  // Holds logged
  done: number;
};

// The Sets planned of a Workout Exercise's hold; none for the walk, or with no plan
function plannedHolds({ id, slug, planned }: InProgressWorkoutExercise): GuidedHold[] {
  const exercise = exerciseBySlug(slug);
  if (exercise?.holdSeconds === undefined || planned?.target.unit !== "seconds") return [];
  const hold: GuidedHold = {
    workoutExerciseId: id,
    slug,
    seconds: planned.target.seconds,
    sides: exercise.unilateral ? 2 : 1,
  };
  return Array.from({ length: planned.sets }, () => hold);
}

// Every Exercise is a Recovery Exercise and there are planned holds. Not one logged afterwards, which is over
export const isGuidedWorkout = ({
  workoutExercises,
  pastStart,
}: Pick<InProgressWorkout, "workoutExercises" | "pastStart">) =>
  !pastStart &&
  workoutExercises.every(({ slug }) => exerciseBySlug(slug)?.recovery) &&
  workoutExercises.some((workoutExercise) => plannedHolds(workoutExercise).length > 0);

export function guidedPlace(
  { workoutExercises }: Pick<InProgressWorkout, "workoutExercises">,
  skips: GuidedSkips,
): GuidedPlace {
  const holds = workoutExercises.flatMap((workoutExercise) => {
    const passed = workoutExercise.sets.length + (skips[workoutExercise.id] ?? 0);
    return plannedHolds(workoutExercise).map((hold, i) => ({ hold, left: i >= passed }));
  });
  const [current, next] = holds.filter(({ left }) => left);
  return {
    current: current?.hold ?? null,
    next: next?.hold ?? null,
    position: current ? holds.indexOf(current) + 1 : holds.length,
    count: holds.length,
    done: holdsDone({ workoutExercises }),
  };
}

// The Sets logged of holds, the walk's left out
export const holdsDone = ({
  workoutExercises,
}: {
  workoutExercises: readonly { slug: string; sets: readonly unknown[] }[];
}) =>
  workoutExercises.reduce(
    (sum, { slug, sets }) => sum + (exerciseBySlug(slug)?.holdSeconds === undefined ? 0 : sets.length),
    0,
  );

export const guidedHold = ({ seconds, sides }: GuidedHold): Hold => ({
  leadInSeconds: CHANGE_SECONDS,
  sides,
  ends: "at-target",
  target: { min: seconds },
});

export function startGuidedRun(now: Date, paused = false): HoldRun {
  const run: HoldRun = { startedAt: now.getTime(), pauses: [] };
  return paused ? pauseHold(run, now) : run;
}

// Longer than this between looks and the phone was locked or the app in the background
const AWAY_MS = 2000;

// What happens to a hold between one look at it and the next: pausing where it was if nobody looked for a while, a
// long alert as a side starts and ends and a short one for each of its last seconds, and whether every side is done
export function guidedStep(
  hold: Hold,
  run: HoldRun,
  before: Date,
  now: Date,
): { run: HoldRun; alert: "long" | "short" | null; done: boolean } {
  if (isHoldPaused(run)) return { run, alert: null, done: false };
  if (now.getTime() - before.getTime() > AWAY_MS) return { run: pauseHold(run, before), alert: null, done: false };
  const cues = holdCues(hold, run, before, now);
  return {
    run,
    alert: cues.length === 0 ? null : cues.some(({ cue }) => cue !== "last-seconds") ? "long" : "short",
    done: holdState(hold, run, now).phase === "done",
  };
}
