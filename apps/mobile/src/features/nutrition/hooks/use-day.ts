import { Day } from "@fit/shared";
import { useCallback, useState } from "react";
import { useApi } from "@/api";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { useReloadOnVisit } from "@/features/workouts/hooks/use-reload-on-visit";
import { errorMessage } from "@/utils/error-message";

// One local date from GET /days/:date, "today" by default, which the server works out in the user's timezone:
// undefined until it arrives (or when it can't). The phone keeps no copy, so offline there's none. Reloads on every
// visit and whenever the profile changes, since the Daily Targets follow the Goal, Activity Level and fibre target
export function useDay(date = "today") {
  const api = useApi();
  const { user } = useCurrentUser();
  const [day, setDay] = useState<Day | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const profile = user?.profile;

  const refresh = useCallback(async () => {
    try {
      setDay(Day.parse(await api(`/days/${date}`)));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
    // The profile is a dependency only so a change to it reloads the day
  }, [api, date, profile]);

  useReloadOnVisit(refresh);

  return { day, error, refresh };
}
