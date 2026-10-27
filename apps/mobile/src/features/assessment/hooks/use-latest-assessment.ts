import { LatestAssessment } from "@fit/shared";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/api";
import { useLogbook } from "@/features/workouts/logbook-provider";
import { errorMessage } from "@/utils/error-message";

// The newest Assessment and its Working Levels from GET /assessments/latest: undefined until it arrives (or when it
// can't), null when there's none yet. The phone keeps no copy. Reloads on every visit, and when a Pending Workout
// uploads, since that may be the B that completes an Assessment
export function useLatestAssessment() {
  const api = useApi();
  const { pending } = useLogbook();
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

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const pendingCount = useRef(pending.length);
  useEffect(() => {
    if (pending.length < pendingCount.current) refresh();
    pendingCount.current = pending.length;
  }, [pending.length, refresh]);

  return { latest, error, refresh };
}
