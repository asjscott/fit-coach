import { exerciseBySlug, isJump, takesOneSet, targetRange, type TargetRange } from "@fit/engines";
import type { SetTarget } from "@fit/shared";

// The library is built into the app, so Workouts work with no signal. undefined for an Exercise this app version
// doesn't know; show the slug instead
export const libraryExercise = exerciseBySlug;

// How an Exercise's Sets read: per side for a one-sided Exercise, a Jump's reps as contacts (#105, #141), and the
// one-Set walk in minutes, every other timed Exercise in seconds (#177)
export type SetReading = { unilateral: boolean; jump: boolean; inMinutes: boolean };

// An Exercise this app version doesn't know reads as a two-sided one with reps
export const setReading = (slug: string): SetReading => {
  const exercise = libraryExercise(slug);
  return {
    unilateral: exercise?.unilateral ?? false,
    jump: !!exercise && isJump(exercise),
    inMinutes: takesOneSet(slug),
  };
};

// The same, with the range its targets read with (#183): none for one number
export type TargetReading = SetReading & { rangeOf?: (target: SetTarget) => TargetRange | null };

// The deload week's targets, and those of an Exercise this app version doesn't know, read as one number
export const targetReading = (slug: string, deloadWeek: boolean | undefined): TargetReading => {
  const exercise = libraryExercise(slug);
  if (!exercise || deloadWeek) return setReading(slug);
  return { ...setReading(slug), rangeOf: (target) => targetRange(exercise, target) };
};

// The Exercise's name, or its slug when this app version doesn't know it
export const exerciseName = (slug: string) => libraryExercise(slug)?.name ?? slug;
