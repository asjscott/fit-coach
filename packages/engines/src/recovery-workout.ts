import type { Exercise, InjuryTag, PlannedExercise } from "@fit/shared";
import { EXERCISES, exerciseBySlug } from "./data/exercises";
import { isAvailable, isSafeFor, type ProfileWithLoads } from "./equipment";
import { sharedPrimaryMuscles } from "./alternative-exercises";

export type RecoveryExercise = Pick<PlannedExercise, "slug" | "sets" | "target">;

// The Recovery Workout (GLOSSARY.md): about 30 minutes, whatever the Length. The walk as one 20-minute Set, then each
// hold for 2 × 45 seconds. Every Exercise is a Recovery Exercise, from the library built into the app, so it starts
// offline
export const RECOVERY_WORKOUT: readonly RecoveryExercise[] = [
  { slug: "walk", sets: 1, target: { unit: "seconds", seconds: 20 * 60 } },
  ...["hip-flexor-stretch", "open-book", "cat-cow", "worlds-greatest-stretch"].map((slug) => ({
    slug,
    sets: 2,
    target: { unit: "seconds" as const, seconds: 45 },
  })),
];

// A Recovery Exercise held for seconds per side, as every one but the walk is
export const isHold = (exercise: Exercise | undefined): exercise is Exercise & { holdSeconds: number } =>
  exercise?.holdSeconds !== undefined;

// A one-sided Exercise is held on each side in turn
export const sidesOf = (exercise: Pick<Exercise, "unilateral"> | undefined): 1 | 2 => (exercise?.unilateral ? 2 : 1);

// Everything the equipment and injuries allow of the Recovery Exercises but the walk
export const possibleHolds = (equipmentProfile: ProfileWithLoads, injuries: readonly InjuryTag[]) =>
  EXERCISES.filter(
    (exercise) => isHold(exercise) && isAvailable(exercise, equipmentProfile) && isSafeFor(exercise, [...injuries]),
  );

// Most like the hold first: by the primary Muscles they share, then the same area, then the library's order
export const byLikeness = (hold: Exercise) => (a: Exercise, b: Exercise) =>
  sharedPrimaryMuscles(hold, b) - sharedPrimaryMuscles(hold, a) ||
  Number(b.area === hold.area) - Number(a.area === hold.area);

// The Recovery Workout the user can do, for the phone's start and the planner's fallback alike (#197): each hold their
// injuries or equipment rule out gives way to the one most like it, keeping its Sets (2 × 45 s), and drops out when
// none is left. The walk always stays
export function recoveryWorkoutFor({
  equipmentProfile,
  injuries,
}: {
  equipmentProfile: ProfileWithLoads;
  injuries: readonly InjuryTag[];
}): RecoveryExercise[] {
  const possible = possibleHolds(equipmentProfile, injuries);
  const used = new Set(RECOVERY_WORKOUT.map(({ slug }) => slug));
  return RECOVERY_WORKOUT.flatMap((planned) => {
    const hold = exerciseBySlug(planned.slug);
    if (!isHold(hold) || possible.includes(hold)) return [planned];
    const [standIn] = possible.filter(({ slug }) => !used.has(slug)).sort(byLikeness(hold));
    if (!standIn) return [];
    used.add(standIn.slug);
    return [{ ...planned, slug: standIn.slug }];
  });
}

// The walk is one 20-minute Set (#109): no rest after it, straight on to the stretches, and no Set 2. Every other
// Exercise, and one this app version doesn't know, takes Sets past its target
export const takesOneSet = (slug: string) => !!exerciseBySlug(slug)?.oneSet;

// Whether the logging screen offers a next Set: not once the walk has its one
export const takesAnotherSet = ({ slug, sets }: LoggedWorkoutExercise) => !takesOneSet(slug) || sets.length === 0;

// What it takes to tell a Recovery Workout, however it came to be logged
export type LoggedWorkoutExercise = { slug: string; sets: readonly unknown[] };
export type LoggedWorkout = { workoutExercises: readonly LoggedWorkoutExercise[] };

// A Workout whose Sets are all of Recovery Exercises. It isn't training: it counts towards neither This Week, the days
// per week nor a Rest Day, and the planner plans as though it never happened. Known by its Exercises rather than a
// flag, so a Manual Workout of just a walk is one too, and nothing about storing or syncing a Workout changes
export function isRecoveryWorkout({ workoutExercises }: LoggedWorkout) {
  const done = workoutExercises.filter(({ sets }) => sets.length > 0);
  return done.length > 0 && done.every(({ slug }) => exerciseBySlug(slug)?.recovery);
}

export const trainingWorkouts = <Workout extends LoggedWorkout>(workouts: readonly Workout[]) =>
  workouts.filter((workout) => !isRecoveryWorkout(workout));
