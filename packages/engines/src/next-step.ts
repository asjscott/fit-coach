import type { InProgressWorkout } from "@fit/shared";
import { supersetGroups, supersetPartner, supersetTurn, type PlannedProgress } from "./supersets";

// The next Exercise of a Workout started from a plan still short of its target Sets: in order after `afterId`, wrapping
// round to any skipped, or the first. A superset is one step, which opens on whoever's turn it is (#180)
export function nextPlannedExercise(workoutExercises: readonly PlannedProgress[], afterId?: string) {
  const groups = supersetGroups(workoutExercises);
  const start = groups.findIndex((group) => group.some(({ id }) => id === afterId)) + 1;
  return [...groups.slice(start), ...groups.slice(0, start)]
    .map((group) => supersetTurn(group.filter(({ planned }) => planned)))
    .find((turn) => turn)?.id;
}

// What moves on from an Exercise (#180): the next one, or Finish once every planned Set is done. As the main button it
// comes with "Log extra set"; otherwise it's secondary, and logging the Exercise's next Set stays the main thing
export type NextStep = ({ to: "exercise"; id: string } | { to: "finish" }) & { main: boolean };

// The step offered after the Sets an Exercise has, or null: once it and its superset have theirs, or with no plan, any.
// An Assessment Workout has its own Next test
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
