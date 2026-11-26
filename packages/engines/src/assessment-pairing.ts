import type { Assessment, AssessmentMarker, Workout } from "@fit/shared";

// What pairing needs from an Assessment Workout
export type AssessmentWorkoutRef = Pick<Workout, "id" | "startedAt"> & { assessment: AssessmentMarker };

export type AssessmentWorkouts = Pick<Assessment, "workoutIds">;

// The latest of the Workouts that is this Assessment Workout, and started before `before` when given
export function latestAssessmentWorkout<W extends Pick<Workout, "startedAt" | "assessment">>(
  workouts: readonly W[],
  marker: AssessmentMarker,
  before?: string,
): W | undefined {
  const time = (w: W) => Date.parse(w.startedAt);
  return workouts
    .filter((w) => w.assessment === marker && (before === undefined || time(w) < Date.parse(before)))
    .reduce<W | undefined>((latest, w) => (latest && time(latest) >= time(w) ? latest : w), undefined);
}

// The Workouts of the Assessment `workout` completes now it's on the server, or null. A single Assessment Workout is
// one by itself. Of the old pairs, a B pairs with the latest A that started before it, so an A that synced after its B
// completes the pair too, and a B whose A was deleted pairs with none
export function workoutsToAssess(
  workout: AssessmentWorkoutRef,
  { workouts, assessments }: { workouts: AssessmentWorkoutRef[]; assessments: AssessmentWorkouts[] },
): AssessmentWorkouts | null {
  // Each Workout is in at most one Assessment, so a retried upload recomputes nothing
  const assessed = new Set(assessments.flatMap(({ workoutIds }) => workoutIds));
  if (workout.assessment === "single") return assessed.has(workout.id) ? null : { workoutIds: [workout.id] };
  const latestABefore = (b: AssessmentWorkoutRef) => latestAssessmentWorkout(workouts, "A", b.startedAt);
  const pairs = (a: AssessmentWorkoutRef | undefined, b: AssessmentWorkoutRef) =>
    a !== undefined && latestABefore(b)?.id === a.id && !assessed.has(a.id) && !assessed.has(b.id);

  const inOrder = [...workouts].sort((x, y) => Date.parse(x.startedAt) - Date.parse(y.startedAt));
  const [a, b] =
    workout.assessment === "B"
      ? [latestABefore(workout), workout]
      : [workout, inOrder.find((other) => other.assessment === "B" && pairs(workout, other))];
  return a && b && pairs(a, b) ? { workoutIds: [a.id, b.id] } : null;
}
