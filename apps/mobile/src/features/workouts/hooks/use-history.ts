import { Workout } from "@fit/shared";
import { useCallback, useRef, useState } from "react";
import { useApi } from "@/api";

const PAGE_SIZE = 20;

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

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

  const fetchPage = useCallback(
    async (before?: string) => {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (before) query.set("before", before);
      const page = Workout.array().parse(await api(`/workouts?${query}`));
      return { page, hasMore: page.length === PAGE_SIZE };
    },
    [api],
  );

  // Loads the newest page again, so a just-uploaded Workout shows at the top
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await fetchPage();
      if (current !== generation.current) return;
      setWorkouts(result.page);
      setHasMore(result.hasMore);
      setError(null);
    } catch (err) {
      if (current === generation.current) setError(errorMessage(err));
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!workouts?.length || !hasMore || loadingMore.current) return;
    const current = generation.current;
    loadingMore.current = true;
    setIsLoadingMore(true);
    try {
      const result = await fetchPage(workouts[workouts.length - 1].startedAt);
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

  return { workouts, error, isLoading: !workouts && !error, isLoadingMore, refresh, loadMore, deleteWorkout };
}
