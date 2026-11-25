import { supersetPartner, supersetTurn } from "@fit/engines";
import type { InProgressWorkoutExercise } from "@fit/shared";
import { nextPlannedExercise } from "./current-workout-exercise";

export type UpNext = {
  workoutExercise: InProgressWorkoutExercise;
  setNumber: number;
  // How many Sets its plan has; none in a Manual or Assessment Workout, or for a Set past the plan
  plannedSets?: number;
};

// The Set coming after the rest that follows a Set of `afterId` (#179), or null when there's none: within the Exercise,
// then its superset, then the next Exercise with Sets left. An Assessment Workout passes which tests still take Sets
export function upNext(
  workoutExercises: readonly InProgressWorkoutExercise[],
  afterId: string,
  takesSets?: (test: InProgressWorkoutExercise) => boolean,
): UpNext | null {
  const after = workoutExercises.find(({ id }) => id === afterId);
  const next = takesSets
    ? after && takesSets(after)
      ? after
      : workoutExercises.find(takesSets)
    : nextUnderPlan(workoutExercises, after);
  if (!next) return null;
  return { workoutExercise: next, setNumber: next.sets.length + 1, plannedSets: next.planned?.sets };
}

function nextUnderPlan(
  workoutExercises: readonly InProgressWorkoutExercise[],
  after: InProgressWorkoutExercise | undefined,
) {
  // Whose turn it is in its superset, or the Exercise itself while it has Sets left; one with no plan always has
  const turnOf = (workoutExercise: InProgressWorkoutExercise) => {
    const partner = supersetPartner(workoutExercises, workoutExercise);
    const group = partner
      ? workoutExercises.filter((member) => member === workoutExercise || member === partner)
      : [workoutExercise];
    return supersetTurn(group);
  };
  const turn = after && turnOf(after);
  if (turn) return turn;
  const nextId = nextPlannedExercise(workoutExercises, after?.id);
  const next = workoutExercises.find(({ id }) => id === nextId);
  return next && turnOf(next);
}
