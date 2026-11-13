import type { Assessment, Workout, WorkoutExercise } from "@fit/shared";
import { mondayBefore, mondayOf } from "./week-ledger";

// A Block's length in weeks, its last the deload week. M6 tunes it here
export const BLOCK_WEEKS = 5;

// Where this week falls in the Block: 1 is the week the Assessment finished
export type BlockWeek = { week: number; deload: boolean };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// The week of the Block, worked out from the latest Assessment rather than stored, or null before the first. A Block
// starts on the Monday of the week the Assessment's B Workout started, in the user's timezone, so its weeks are the
// Week Ledger's. A newer Assessment starts a new Block from its own week; with none, the next Block starts the Monday
// after the deload week
export function weekOfBlock(
  assessment: Pick<Assessment, "bStartedAt"> | null,
  now: Date,
  timeZone: string,
): BlockWeek | null {
  if (!assessment) return null;
  const start = mondayOf(new Date(assessment.bStartedAt), timeZone);
  // Both Mondays are UTC midnights, so they're whole weeks apart. A clock behind the Assessment's week reads week 1
  const weeks = Math.max(0, Math.round((Date.parse(mondayOf(now, timeZone)) - Date.parse(start)) / WEEK_MS));
  const week = (weeks % BLOCK_WEEKS) + 1;
  return { week, deload: week === BLOCK_WEEKS };
}

type RetakeWorkout = Pick<Workout, "startedAt" | "assessment"> & {
  workoutExercises: readonly Pick<WorkoutExercise, "slug" | "sets">[];
};

// The Exercises whose Working Levels a retake keeps (#137, story 71): those with Sets logged in the last Block, the
// BLOCK_WEEKS weeks up to the retake's A, that the retake didn't test. Every other level takes the retake's. An
// Assessment Workout's Sets set levels rather than train them, so they don't count
export function keptByRetake({
  workouts,
  assessment,
  aStartedAt,
  timeZone,
}: {
  workouts: readonly RetakeWorkout[];
  assessment: Pick<Assessment, "patterns">;
  aStartedAt: string;
  timeZone: string;
}): Set<string> {
  let blockStart = mondayOf(new Date(aStartedAt), timeZone);
  for (let week = 1; week < BLOCK_WEEKS; week++) blockStart = mondayBefore(blockStart);
  const tested = new Set(
    Object.values(assessment.patterns).flatMap((pattern) => (pattern.estimated ? [] : [pattern.slug])),
  );
  const trained = workouts
    .filter(
      ({ startedAt, assessment: part }) =>
        !part &&
        Date.parse(startedAt) < Date.parse(aStartedAt) &&
        mondayOf(new Date(startedAt), timeZone) >= blockStart,
    )
    .flatMap(({ workoutExercises }) => workoutExercises.filter(({ sets }) => sets.length).map(({ slug }) => slug));
  return new Set(trained.filter((slug) => !tested.has(slug)));
}
