import { LatestAssessment } from "@fit/shared";
import { useCallback, useState } from "react";
import { useApi } from "@/api";
import { useReloadOnVisit } from "@/features/workouts/hooks/use-reload-on-visit";
import { errorMessage } from "@/utils/error-message";

// The newest Assessment and its Working Levels from GET /assessments/latest: undefined until it arrives (or when it
// can't), null when there's none yet. The phone keeps no copy. Reloads on every visit, and when a Pending Workout
// uploads, since that may be the B that completes an Assessment
export function useLatestAssessment() {
  const api = useApi();
  const [latest, setLatest] = useState<LatestAssessment | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLatest(LatestAssessment.parse(await api("/assessments/latest")));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [api]);

  useReloadOnVisit(refresh);

  return { latest, error, refresh };
}
