import type { Exercise, Pr, PrMeasure, Set, Workout } from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";
import { e1rm, MAX_E1RM_REPS } from "./e1rm";

type WorkoutWithExercises = Pick<Workout, "workoutExercises">;

// A weighted Ballistic Exercise's PR is the heaviest load lifted for this many reps
const BALLISTIC_PR_REPS = 8;

// What an Exercise's PR measures, or null for one that has none: a carry, whose reps mean nothing, a Recovery
// Exercise, which isn't training, and an Exercise the library doesn't know
export function prMeasure(exercise: Exercise | undefined): PrMeasure | null {
  if (!exercise || exercise.recovery) return null;
  if (exercise.patterns.some(({ pattern }) => pattern === "carry")) return null;
  if (exercise.loadType === "bodyweight") return "reps";
  if (exercise.loadType === "timed") return "seconds";
  return exercise.ballistic ? "load" : "e1rm";
}

// Rounded, so the same Set measured twice is never a PR over itself
const rounded = (value: number) => Math.round(value * 100) / 100;

// What one Set is worth by this measure, or null when it doesn't count towards it
function setValue(set: Set, measure: PrMeasure): number | null {
  if (set.kind === "external") {
    if (measure === "e1rm") return set.reps <= MAX_E1RM_REPS ? rounded(e1rm(set.kg, set.reps)) : null;
    if (measure === "load") return set.reps >= BALLISTIC_PR_REPS ? set.kg : null;
    return null;
  }
  if (set.kind === "bodyweight") return measure === "reps" ? set.reps : null;
  return measure === "seconds" ? set.seconds : null;
}

// The best Set of an Exercise across these Workouts by this measure, or null when none counts
function bestOf(workouts: WorkoutWithExercises[], slug: string, measure: PrMeasure): number | null {
  const values = workouts
    .flatMap((w) => w.workoutExercises)
    .filter((we) => we.slug === slug)
    .flatMap((we) => we.sets.map((set) => setValue(set, measure)))
    .filter((value) => value !== null);
  return values.length ? Math.max(...values) : null;
}

// The PRs a Workout sets, one per Exercise, against the user's Workouts that started before it. An Exercise with no
// best before this Workout sets a baseline, not a PR. Assessment Workouts count like any other
export function findPrs(workout: WorkoutWithExercises, earlier: WorkoutWithExercises[]): Pr[] {
  const slugs = [...new Set(workout.workoutExercises.map((we) => we.slug))];
  return slugs.flatMap((slug) => {
    const measure = prMeasure(exerciseBySlug(slug));
    if (!measure) return [];
    const best = bestOf([workout], slug, measure);
    const previous = bestOf(earlier, slug, measure);
    return best !== null && previous !== null && best > previous ? [{ slug, measure, best, previous }] : [];
  });
}
