import { WeekSummary } from "@fit/shared";
import { useCallback, useRef, useState } from "react";
import { ApiError, useApi } from "@/api";
import { useReloadOnVisit } from "@/features/workouts/hooks/use-reload-on-visit";
import { errorMessage } from "@/utils/error-message";

// The Week Summary for the week starting on `monday`, from GET /week-summaries/:monday, worked out live on each visit
// (ADR 0009). The phone keeps no copy, so offline there's none
export function useWeekSummary(monday: string) {
  const api = useApi();
  const [summary, setSummary] = useState<WeekSummary | undefined>();
  const [error, setError] = useState<string | null>(null);
  // The API couldn't be reached at all, as opposed to answering with an error
  const [isOffline, setIsOffline] = useState(false);
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    // An answer overtaken by a later ask is dropped
    const ask = ++latest.current;
    setError(null);
    setIsOffline(false);
    try {
      const week = WeekSummary.parse(await api(`/week-summaries/${monday}`));
      if (ask === latest.current) setSummary(week);
    } catch (err) {
      if (ask !== latest.current) return;
      setError(errorMessage(err));
      setIsOffline(!(err instanceof ApiError));
    }
  }, [api, monday]);

  useReloadOnVisit(refresh);

  return { summary: summary?.monday === monday ? summary : undefined, error, isOffline, refresh };
}
