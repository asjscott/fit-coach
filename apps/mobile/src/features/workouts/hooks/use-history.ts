import { weeklyVolumeStart } from "@fit/engines";
import { Workout } from "@fit/shared";
import { useCallback, useRef, useState } from "react";
import { useApi } from "@/api";
import { errorMessage } from "@/utils/error-message";

const PAGE_SIZE = 20;

// The user's uploaded Workouts from the server, newest first, a page at a time.
// Nothing is stored on the phone (ADR 0001). Use it through HistoryProvider, so the
// History and Workout detail screens share one list
export function useHistoryState() {
  const api = useApi();
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Ignores a page that arrives after a newer refresh started
  const generation = useRef(0);
  const loadingMore = useRef(false);

  // The page after the given Workout, or the newest page
  const fetchPage = useCallback(
    async (after?: Workout) => {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (after) {
        query.set("before", after.startedAt);
        query.set("beforeId", after.id);
      }
      const page = Workout.array().parse(await api(`/workouts?${query}`));
      return { page, hasMore: page.length === PAGE_SIZE };
    },
    [api],
  );

  // Loads the newest pages again, so a just-uploaded Workout shows at the top. Pages back until the
  // weekly Volume's 8 weeks are covered, so those weeks' totals are whole
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    const since = weeklyVolumeStart(new Date()).getTime();
    try {
      let loaded: Workout[] = [];
      let more = true;
      let oldest: Workout | undefined;
      while (more && (!oldest || Date.parse(oldest.startedAt) >= since)) {
        const result = await fetchPage(oldest);
        if (current !== generation.current) return;
        loaded = [...loaded, ...result.page];
        more = result.hasMore;
        oldest = loaded.at(-1);
      }
      setWorkouts(loaded);
      setHasMore(more);
      setError(null);
    } catch (err) {
      // Offline: drop what was shown, so History holds only the Pending Workouts
      if (current !== generation.current) return;
      setWorkouts(null);
      setError(errorMessage(err));
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!workouts?.length || !hasMore || loadingMore.current) return;
    const current = generation.current;
    loadingMore.current = true;
    setIsLoadingMore(true);
    try {
      const result = await fetchPage(workouts[workouts.length - 1]);
      if (current !== generation.current) return;
      setWorkouts([...workouts, ...result.page]);
      setHasMore(result.hasMore);
    } catch (err) {
      if (current === generation.current) setError(errorMessage(err));
    } finally {
      loadingMore.current = false;
      setIsLoadingMore(false);
    }
  }, [fetchPage, hasMore, workouts]);

  // Deletes an uploaded Workout on the server, then drops it from the list. Throws when
  // the request fails (for example, offline), leaving the Workout in place
  const deleteWorkout = useCallback(
    async (id: string) => {
      await api(`/workouts/${encodeURIComponent(id)}`, { method: "DELETE" });
      setWorkouts((current) => current?.filter((workout) => workout.id !== id) ?? null);
    },
    [api],
  );

  // workouts is null while loading, and after the newest page failed to load (offline)
  return { workouts, error, isLoading: !workouts && !error, isLoadingMore, refresh, loadMore, deleteWorkout };
}
