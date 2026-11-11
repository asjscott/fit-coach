import { exerciseBySlug, isJump } from "@fit/engines";

// The library is built into the app, so Workouts work with no signal. undefined for an Exercise this app version
// doesn't know; show the slug instead
export const libraryExercise = exerciseBySlug;

// Whether the Exercise is a jump, whose reps are contacts (#105)
export const isJumpSlug = (slug: string) => {
  const exercise = libraryExercise(slug);
  return !!exercise && isJump(exercise);
};

// The Exercise's name, or its slug when this app version doesn't know it
export const exerciseName = (slug: string) => libraryExercise(slug)?.name ?? slug;
