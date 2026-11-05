import { useReloadOnVisit } from "@/features/workouts/hooks/use-reload-on-visit";
import { useLogbook } from "@/features/workouts/logbook-provider";

// The phone's copy of the Planned Workout, whether or not it has signal, asking the server for the latest on every
// visit. The server builds one if it's due, so this also covers a new week and a user with no plan yet
export function usePlannedWorkout() {
  const { plannedWorkoutCopy, refreshPlannedWorkout } = useLogbook();

  useReloadOnVisit(refreshPlannedWorkout);
  return plannedWorkoutCopy;
}
