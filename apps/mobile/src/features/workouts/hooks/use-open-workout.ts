import { router } from "expo-router";
import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { useLogbook, type PlannedWorkoutToStart } from "../logbook-provider";

// Starting a Workout saves it on the phone first; false, after a toast, when that fails
function useStarting<Args extends unknown[]>(start: (...args: Args) => Promise<void>) {
  const { showToast } = useToast();
  const [starting, setStarting] = useState(false);

  const startWorkout = async (...args: Args) => {
    setStarting(true);
    try {
      await start(...args);
      return true;
    } catch (err) {
      showToast("Couldn't start a Workout", { error: err });
      return false;
    } finally {
      setStarting(false);
    }
  };

  return { startWorkout, starting };
}

export const useStartWorkout = () => useStarting(useLogbook().start);

export function useStartPlannedWorkout() {
  const { startWorkout, starting } = useStarting<[PlannedWorkoutToStart]>(useLogbook().startPlannedWorkout);
  return { startPlannedWorkout: startWorkout, startingPlan: starting };
}

export function useStartRecoveryWorkout() {
  const { startWorkout } = useStarting(useLogbook().startRecoveryWorkout);
  return { startRecoveryWorkout: startWorkout };
}

// Resuming opens the In-progress Workout, unless it was forgotten: then `forgotten` asks for the
// ForgottenWorkoutModal, which must be dealt with before carrying on
export function useResumeWorkout() {
  const { isStale } = useLogbook();
  const [forgotten, setForgotten] = useState(false);

  const resumeWorkout = async () => {
    if (await isStale()) setForgotten(true);
    else router.push("/workout");
  };

  return { resumeWorkout, forgotten, setForgotten };
}
