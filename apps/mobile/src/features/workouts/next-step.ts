import { supersetPartner, type PlannedProgress } from "@fit/engines";
import type { InProgressWorkout } from "@fit/shared";
import { nextPlannedExercise } from "./current-workout-exercise";

// What moves on from an Exercise (#180): the next one, or Finish once every planned Set is done. As the main button it
// comes with "Log extra set"; otherwise it's secondary, and logging the Exercise's next Set stays the main thing
export type NextStep = ({ to: "exercise"; id: string } | { to: "finish" }) & { main: boolean };

// The step offered after the Sets an Exercise has, or null for none. A planned one offers it once it, and its superset,
// have all their Sets. One with no plan offers it after any Set: in a Manual Workout to the Exercise after it, else to
// the plan's. An Assessment Workout has its own Next test
export function nextStep(
  {
    workoutExercises,
    assessment,
  }: Pick<InProgressWorkout, "assessment"> & { workoutExercises: readonly PlannedProgress[] },
  workoutExerciseId: string,
): NextStep | null {
  const index = workoutExercises.findIndex(({ id }) => id === workoutExerciseId);
  const logged = workoutExercises[index];
  if (assessment || !logged) return null;
  const isDone = ({ sets, planned }: PlannedProgress) => sets.length >= (planned?.sets ?? 1);
  const partner = supersetPartner(workoutExercises, logged);
  if (!isDone(logged) || (partner && !isDone(partner))) return null;

  if (!workoutExercises.some(({ planned }) => planned)) {
    const after = workoutExercises[index + 1];
    return after ? { to: "exercise", id: after.id, main: false } : null;
  }
  const main = !!logged.planned;
  const id = nextPlannedExercise(workoutExercises, workoutExerciseId);
  return id === undefined ? { to: "finish", main } : { to: "exercise", id, main };
}
