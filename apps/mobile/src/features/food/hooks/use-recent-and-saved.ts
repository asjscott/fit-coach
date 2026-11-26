import { RecentFoods, SavedFoods } from "@fit/shared";
import { useCallback, useState } from "react";
import { useApi } from "@/api";
import { useReloadOnVisit } from "@/features/workouts/hooks/use-reload-on-visit";
import { errorMessage } from "@/utils/error-message";
import { type RecentChoice, recentAndSaved } from "../recent-and-saved";

// The Ideas and recent half's one-tap choices: the user's Saved Foods and Saved Meals, then their Recent foods (spec
// #158 story 62). Undefined until they arrive; reloads on every visit, and on `refresh` after a food is logged or saved
export function useRecentAndSaved() {
  const api = useApi();
  const [choices, setChoices] = useState<RecentChoice[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [saved, recent] = await Promise.all([api("/saved-foods"), api("/foods/recent")]);
      setChoices(recentAndSaved(SavedFoods.parse(saved).foods, RecentFoods.parse(recent).foods));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [api]);

  useReloadOnVisit(refresh);

  return { choices, error, refresh };
}
