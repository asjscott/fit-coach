import { Day } from "@fit/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, useApi } from "@/api";
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
  // The API couldn't be reached at all, as opposed to answering with an error
  const [isOffline, setIsOffline] = useState(false);
  const profile = user?.profile;

  const refresh = useCallback(async () => {
    try {
      setDay(Day.parse(await api(`/days/${date}`)));
      setError(null);
      setIsOffline(false);
    } catch (err) {
      setError(errorMessage(err));
      setIsOffline(!(err instanceof ApiError));
    }
    // The profile is a dependency only so a change to it reloads the day
  }, [api, date, profile]);

  useReloadOnVisit(refresh);

  // A visit doesn't follow a profile saved on the screen itself, such as the Diet changed on the Ideas half
  const shownProfile = useRef(profile);
  useEffect(() => {
    if (shownProfile.current === profile) return;
    shownProfile.current = profile;
    void refresh();
  }, [profile, refresh]);

  return { day, error, isOffline, refresh };
}
