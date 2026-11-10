import type { PlannedExercise } from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";

// The Recovery Workout (GLOSSARY.md): about 30 minutes, whatever the Length. The walk as one 20-minute Set, then each
// hold for 2 × 45 seconds. Every Exercise is a Recovery Exercise, from the library built into the app, so it starts
// offline
export const RECOVERY_WORKOUT: readonly Pick<PlannedExercise, "slug" | "sets" | "target">[] = [
  { slug: "walk", sets: 1, target: { unit: "seconds", seconds: 20 * 60 } },
  ...["hip-flexor-stretch", "open-book", "cat-cow", "worlds-greatest-stretch"].map((slug) => ({
    slug,
    sets: 2,
    target: { unit: "seconds" as const, seconds: 45 },
  })),
];

// The walk is one 20-minute Set (#109): no rest after it, straight on to the stretches, and no Set 2. Every other
// Exercise rests between Sets and takes Sets past its target
export const takesOneSet = (slug: string) => slug === "walk";

// Whether the logging screen offers a next Set: not once the walk has its one
export const takesAnotherSet = ({ slug, sets }: LoggedWorkoutExercise) => !takesOneSet(slug) || sets.length === 0;

// What it takes to tell a Recovery Workout, however it came to be logged
export type LoggedWorkoutExercise = { slug: string; sets: readonly unknown[] };
type LoggedWorkout = { workoutExercises: readonly LoggedWorkoutExercise[] };

// A Workout whose Sets are all of Recovery Exercises. It isn't training: it counts towards neither This Week, the days
// per week nor a Rest Day, and the planner plans as though it never happened. Known by its Exercises rather than a
// flag, so a Manual Workout of just a walk is one too, and nothing about storing or syncing a Workout changes
export function isRecoveryWorkout({ workoutExercises }: LoggedWorkout) {
  const done = workoutExercises.filter(({ sets }) => sets.length > 0);
  return done.length > 0 && done.every(({ slug }) => exerciseBySlug(slug)?.recovery);
}

export const trainingWorkouts = <Workout extends LoggedWorkout>(workouts: readonly Workout[]) =>
  workouts.filter((workout) => !isRecoveryWorkout(workout));
