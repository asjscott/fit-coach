import type { Assessment, AssessmentPart, Workout } from "@fit/shared";

// What pairing needs from an Assessment Workout
export type AssessmentWorkoutRef = Pick<Workout, "id" | "startedAt"> & { assessment: AssessmentPart };

export type AssessmentPair = Pick<Assessment, "aWorkoutId" | "bWorkoutId">;

// The pair of Assessment Workouts to work out an Assessment from, now that `workout` has reached the server, or null.
// `workouts` are the user's Assessment Workouts on the server, `workout` among them, and `assessments` the pairs
// already assessed.
// A B pairs with the latest A that started before it, with no other B between them; an A that arrives after its B
// (they synced out of order) makes the same pair. So deleting an A before its B arrives leaves that B unpaired
export function pairToAssess(
  workout: AssessmentWorkoutRef,
  { workouts, assessments }: { workouts: AssessmentWorkoutRef[]; assessments: AssessmentPair[] },
): AssessmentPair | null {
  const inOrder = [...workouts].sort((x, y) => Date.parse(x.startedAt) - Date.parse(y.startedAt));
  const at = inOrder.findIndex((other) => other.id === workout.id);
  const [a, b] = workout.assessment === "B" ? [inOrder[at - 1], workout] : [workout, inOrder[at + 1]];
  if (a?.assessment !== "A" || b?.assessment !== "B") return null;
  // A pair is assessed once, so a retried upload recomputes nothing
  if (assessments.some((done) => done.aWorkoutId === a.id && done.bWorkoutId === b.id)) return null;
  return { aWorkoutId: a.id, bWorkoutId: b.id };
}
