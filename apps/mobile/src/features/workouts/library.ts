import { exerciseBySlug } from "@fit/engines";

// The library is built into the app, so Workouts work with no signal. undefined for an Exercise this app version
// doesn't know; show the slug instead
export const libraryExercise = exerciseBySlug;

// The Exercise's name, or its slug when this app version doesn't know it
export const exerciseName = (slug: string) => libraryExercise(slug)?.name ?? slug;
