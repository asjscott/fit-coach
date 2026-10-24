import { EXERCISES } from "@fit/engines";

// The library built into the app, so Workouts work with no signal
const bySlug = new Map(EXERCISES.map((exercise) => [exercise.slug, exercise]));

// undefined for an Exercise this app version doesn't know; show the slug instead
export const libraryExercise = (slug: string) => bySlug.get(slug);

// The Exercise's name, or its slug when this app version doesn't know it
export const exerciseName = (slug: string) => libraryExercise(slug)?.name ?? slug;
