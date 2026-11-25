import { NutritionWeek } from "@fit/shared";
import { useCallback, useRef, useState } from "react";
import { ApiError, useApi } from "@/api";
import { useReloadOnVisit } from "@/features/workouts/hooks/use-reload-on-visit";
import { errorMessage } from "@/utils/error-message";

// A week from GET /nutrition-history/:date, any of its dates or "today": undefined until it arrives (or when it can't).
// The phone keeps no copy, so offline there's none. Reloads on every visit
export function useNutritionWeek(date: string) {
  const api = useApi();
  const [loaded, setLoaded] = useState<{ date: string; week: NutritionWeek } | null>(null);
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
      const week = NutritionWeek.parse(await api(`/nutrition-history/${date}`));
      if (ask === latest.current) setLoaded({ date, week });
    } catch (err) {
      if (ask !== latest.current) return;
      setError(errorMessage(err));
      setIsOffline(!(err instanceof ApiError));
    }
  }, [api, date]);

  useReloadOnVisit(refresh);

  return { week: loaded?.date === date ? loaded.week : undefined, error, isOffline, refresh };
}
