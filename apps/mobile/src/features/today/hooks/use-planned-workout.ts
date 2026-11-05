import { PlannedWorkout } from "@fit/shared";
import { useCallback, useState } from "react";
import { useApi } from "@/api";
import { useReloadOnVisit } from "@/features/workouts/hooks/use-reload-on-visit";

// The Planned Workout from GET /planned-workouts/current: null when there's none, such as before the first Assessment,
// and until it arrives. An upload is what rebuilds it, so it reloads with History
export function usePlannedWorkout() {
  const api = useApi();
  const [plannedWorkout, setPlannedWorkout] = useState<PlannedWorkout | null>(null);

  const refresh = useCallback(async () => {
    try {
      setPlannedWorkout(PlannedWorkout.nullable().parse(await api("/planned-workouts/current")));
    } catch {
      // Keep what's showing: Today's own status line already says when there's no connection
    }
  }, [api]);

  useReloadOnVisit(refresh);

  return plannedWorkout;
}
