import { Exercise } from "@fit/shared";
import { useEffect, useState } from "react";
import { useApi } from "@/api";

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
