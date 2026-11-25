import type { InProgressWorkout, InProgressWorkoutExercise } from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";
import { holdCues, holdState, isHoldPaused, pauseHold, type Hold, type HoldRun } from "./hold-timer";
import { CHANGE_SECONDS } from "./mobility-workout";

// The guided flow runs a Recovery Workout's holds one after another, each logging its Set (#200). Where it is comes
// from the logged Sets and the skips of this run of it

// One Set of a Recovery Exercise: its seconds are per side
export type GuidedHold = { workoutExerciseId: string; slug: string; seconds: number; sides: 1 | 2 };

// Which of each Workout Exercise's holds this run has skipped, from 0
export type GuidedSkips = Readonly<Record<string, readonly number[]>>;

// What a run of the flow knows beyond the logged Sets
export type GuidedCourse = {
  skips: GuidedSkips;
  // The hold gone back to, among all of them from 0
  back?: number;
  // Times one Workout Exercise's holds alone, this many, rather than the Workout's
  only?: { workoutExerciseId: string; count: number };
};

export type GuidedPlace = {
  // null once every hold is logged or skipped
  current: GuidedHold | null;
  next: GuidedHold | null;
  // The current hold's number, or the last's once it's over
  position: number;
  count: number;
  // Holds logged
  done: number;
  // The Set the current hold replaces, when it was gone back to
  replaces?: number;
  hasPrevious: boolean;
};

// The Sets planned of a Workout Exercise's hold; none for the walk, or with no plan
const plannedHolds = (workoutExercise: InProgressWorkoutExercise) =>
  workoutExercise.planned?.target.unit === "seconds" ? repeatedHold(workoutExercise, workoutExercise.planned.sets) : [];

// Every Exercise is a Recovery Exercise and there are planned holds. Not one logged afterwards, which is over
export const isGuidedWorkout = ({
  workoutExercises,
  pastStart,
}: Pick<InProgressWorkout, "workoutExercises" | "pastStart">) =>
  !pastStart &&
  workoutExercises.every(({ slug }) => exerciseBySlug(slug)?.recovery) &&
  workoutExercises.some((workoutExercise) => plannedHolds(workoutExercise).length > 0);

type Holds = Pick<InProgressWorkout, "workoutExercises">;

// Every hold of the run, and what became of it. Sets fill the holds that weren't skipped, in order, and any more of
// them the skipped ones, which were then logged on the ordinary screen
function courseHolds({ workoutExercises }: Holds, { skips, only }: GuidedCourse) {
  return workoutExercises.flatMap((workoutExercise) => {
    const { id, sets } = workoutExercise;
    if (only && only.workoutExerciseId !== id) return [];
    const holds = only ? repeatedHold(workoutExercise, only.count) : plannedHolds(workoutExercise);
    const skipped = (skips[id] ?? []).slice(0, Math.max(0, holds.length - sets.length));
    let filled = 0;
    return holds.map((hold, slot) => {
      const isSkipped = skipped.includes(slot);
      const setIndex = !isSkipped && filled < sets.length ? filled++ : undefined;
      return { hold, slot, setIndex, left: !isSkipped && setIndex === undefined };
    });
  });
}

// As many of a Recovery Exercise's hold, at its planned seconds or else the library's; none for the walk
function repeatedHold({ id, slug, planned }: InProgressWorkoutExercise, count: number): GuidedHold[] {
  const exercise = exerciseBySlug(slug);
  if (exercise?.holdSeconds === undefined) return [];
  const seconds = planned?.target.unit === "seconds" ? planned.target.seconds : exercise.holdSeconds;
  const hold: GuidedHold = { workoutExerciseId: id, slug, seconds, sides: exercise.unilateral ? 2 : 1 };
  return Array.from({ length: count }, () => hold);
}

export function guidedPlace(workout: Holds, course: GuidedCourse): GuidedPlace {
  const holds = courseHolds(workout, course);
  const left = holds.filter((hold) => hold.left);
  const gone = course.back === undefined ? undefined : holds[course.back];
  const current = gone ?? left[0];
  const index = current ? holds.indexOf(current) : holds.length;
  return {
    current: current?.hold ?? null,
    next: (gone ? left[0] : left[1])?.hold ?? null,
    position: current ? index + 1 : holds.length,
    count: holds.length,
    done: holdsDone(workout),
    replaces: current?.setIndex,
    hasPrevious: index > 0,
  };
}

// Back to the hold before, to repeat it or do it if it was skipped, then on from the first hold left
export function backHold(workout: Holds, course: GuidedCourse): GuidedCourse {
  const { hasPrevious, current, position } = guidedPlace(workout, course);
  return hasPrevious ? { ...course, back: current ? position - 2 : position - 1 } : course;
}

// Skipping a hold gone back to leaves it as it was
export function skipHold(workout: Holds, { back, ...course }: GuidedCourse): GuidedCourse {
  const current = back === undefined && courseHolds(workout, course).find(({ left }) => left);
  if (!current) return course;
  const id = current.hold.workoutExerciseId;
  return { ...course, skips: { ...course.skips, [id]: [...(course.skips[id] ?? []), current.slot] } };
}

// After the current hold's Set is logged or replaced; from the Workout as it was before
export function holdLogged(workout: Holds, { back, ...course }: GuidedCourse): GuidedCourse {
  const gone = back === undefined ? undefined : courseHolds(workout, course)[back];
  const id = gone?.hold.workoutExerciseId;
  const skips = id === undefined ? undefined : course.skips[id];
  if (id === undefined || !skips) return course;
  return { ...course, skips: { ...course.skips, [id]: skips.filter((slot) => slot !== gone?.slot) } };
}

// The course that times a Recovery Exercise's next Set by itself, in a Workout whose guided flow doesn't run it
export function holdAlone(
  workoutExercise: InProgressWorkoutExercise,
  workout: Pick<InProgressWorkout, "workoutExercises" | "pastStart">,
): GuidedCourse | null {
  if (workout.pastStart || repeatedHold(workoutExercise, 1).length === 0) return null;
  if (isGuidedWorkout(workout) && plannedHolds(workoutExercise).length > 0) return null;
  return { skips: {}, only: { workoutExerciseId: workoutExercise.id, count: workoutExercise.sets.length + 1 } };
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
