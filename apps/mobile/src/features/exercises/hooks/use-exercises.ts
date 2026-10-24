import { Exercise } from "@fit/shared";
import { useEffect, useState } from "react";
import { ApiError, useApi } from "@/api";

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

// The whole exercise library, loaded once per mount
export function useExercises() {
  const api = useApi();
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api("/exercises")
      .then((json) => setExercises(Exercise.array().parse(json)))
      .catch((err) => setError(errorMessage(err)));
  }, [api]);

  return { exercises, error, isLoading: !exercises && !error };
}

// One exercise by slug
export function useExercise(slug: string) {
  const api = useApi();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api(`/exercises/${encodeURIComponent(slug)}`)
      .then((json) => setExercise(Exercise.parse(json)))
      .catch((err) => setError(err instanceof ApiError && err.status === 404 ? "Exercise not found" : errorMessage(err)));
  }, [api, slug]);

  return { exercise, error, isLoading: !exercise && !error };
}
