import type { InProgressWorkout, InProgressWorkoutExercise, Set, SetValues } from "@fit/shared";
import { libraryExercise } from "./library";

// The optional RPE on each Exercise's last Set (#133, ADR 0007): an RPE of 10 there holds the load and the target. It's
// offered under the Sets once the last one is logged, so skipping it costs no tap and Log set stays where it was

// Whether the logging screen offers an RPE for the Exercise's latest Set: once a planned Exercise has its Sets (and on
// any Set past them, which becomes the last), or after every Set with no plan, since any Set may be the last. Not in an
// Assessment Workout, whose tests ask on every Set and which doesn't progress, nor on a Recovery Exercise
export function offersLastSetRpe(
  workout: Pick<InProgressWorkout, "assessment">,
  { slug, sets, planned }: Pick<InProgressWorkoutExercise, "slug" | "sets" | "planned">,
): boolean {
  if (workout.assessment || libraryExercise(slug)?.recovery) return false;
  return sets.length > 0 && sets.length >= (planned?.sets ?? 1);
}

// A logged Set's values rated at this RPE, or with its RPE taken off, to save in its place
export function withRpe(set: Set, rpe: number | undefined): SetValues {
  const values: Partial<Set> = { ...set };
  delete values.loggedAt;
  delete values.rpe;
  return (rpe === undefined ? values : { ...values, rpe }) as SetValues;
}
