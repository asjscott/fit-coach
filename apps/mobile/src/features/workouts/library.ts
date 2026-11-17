import { exerciseBySlug, isJump } from "@fit/engines";

// The library is built into the app, so Workouts work with no signal. undefined for an Exercise this app version
// doesn't know; show the slug instead
export const libraryExercise = exerciseBySlug;

// How an Exercise's Sets read: per side for a one-sided Exercise, and a Jump's reps as contacts (#105, #141)
export type SetReading = { unilateral: boolean; jump: boolean };

// An Exercise this app version doesn't know reads as a two-sided one with reps
export const setReading = (slug: string): SetReading => {
  const exercise = libraryExercise(slug);
  return { unilateral: exercise?.unilateral ?? false, jump: !!exercise && isJump(exercise) };
};

// The Exercise's name, or its slug when this app version doesn't know it
export const exerciseName = (slug: string) => libraryExercise(slug)?.name ?? slug;
