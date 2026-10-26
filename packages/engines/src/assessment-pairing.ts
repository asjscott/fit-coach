import type { Assessment, AssessmentPart, Workout } from "@fit/shared";

// What pairing needs from an Assessment Workout
export type AssessmentWorkoutRef = Pick<Workout, "id" | "startedAt"> & { assessment: AssessmentPart };

export type AssessmentPair = Pick<Assessment, "aWorkoutId" | "bWorkoutId">;

// The pair of Assessment Workouts to work out an Assessment from, now that `workout` has reached the server, or null.
// `workouts` are the user's Assessment Workouts on the server, `workout` among them, and `assessments` the pairs
// already assessed.
// A B pairs with the latest A that started before it, unless that A already made an Assessment: so deleting an A
// before its B arrives leaves that B unpaired when the A before it was used. An A that arrives after its B (they
// synced out of order) pairs with the first B it's the latest A for that has no Assessment yet
export function pairToAssess(
  workout: AssessmentWorkoutRef,
  { workouts, assessments }: { workouts: AssessmentWorkoutRef[]; assessments: AssessmentPair[] },
): AssessmentPair | null {
  const inOrder = [...workouts].sort((x, y) => Date.parse(x.startedAt) - Date.parse(y.startedAt));
  // Each Workout is in at most one Assessment, so a retried upload recomputes nothing
  const assessed = new Set(assessments.flatMap(({ aWorkoutId, bWorkoutId }) => [aWorkoutId, bWorkoutId]));
  const latestABefore = (b: AssessmentWorkoutRef) =>
    inOrder.filter((other) => other.assessment === "A" && Date.parse(other.startedAt) < Date.parse(b.startedAt)).at(-1);
  const pairs = (a: AssessmentWorkoutRef | undefined, b: AssessmentWorkoutRef) =>
    a !== undefined && latestABefore(b)?.id === a.id && !assessed.has(a.id) && !assessed.has(b.id);

  const [a, b] =
    workout.assessment === "B"
      ? [latestABefore(workout), workout]
      : [workout, inOrder.find((other) => other.assessment === "B" && pairs(workout, other))];
  return a && b && pairs(a, b) ? { aWorkoutId: a.id, bWorkoutId: b.id } : null;
}
