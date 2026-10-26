import { router } from "expo-router";
import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { useLogbook } from "../logbook-provider";

// Starting a Workout saves it on the phone first; false, after a toast, when that fails
export function useStartWorkout() {
  const { start } = useLogbook();
  const { showToast } = useToast();
  const [starting, setStarting] = useState(false);

  const startWorkout = async () => {
    setStarting(true);
    try {
      await start();
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
