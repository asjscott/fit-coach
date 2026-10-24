import type { InProgressWorkout } from "@fit/shared";
import { useState } from "react";

// True once the Workout this screen showed has been finished or discarded. The screen is
// on its way out then, so it should render nothing rather than "No Workout in progress"
export function useHasEnded(workout: InProgressWorkout | null) {
  const [hadWorkout, setHadWorkout] = useState(workout !== null);
  if (workout !== null && !hadWorkout) setHadWorkout(true);
  return hadWorkout && workout === null;
}
