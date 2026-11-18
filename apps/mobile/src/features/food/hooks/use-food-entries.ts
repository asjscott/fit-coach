import { FoodEntry, type FoodEntryAdd, type FoodEntryChange } from "@fit/shared";
import { useCallback, useMemo } from "react";
import { ApiError, useApi } from "@/api";
import { useToast } from "@/contexts/toast-context";

// Logging, changing and deleting Food Entries, straight to the API: there's no queue, so each needs a connection
// (spec #158 story 78). Each answers whether it worked; when it didn't, a toast says why and the caller keeps what
// the user chose, so nothing they typed is lost. `onSaved` runs after each one that worked, to reload the day
export function useFoodEntries(onSaved: () => void) {
  const api = useApi();
  const { showToast } = useToast();

  const write = useCallback(
    async (failure: string, request: () => Promise<unknown>) => {
      try {
        await request();
        onSaved();
        return true;
      } catch (err) {
        if (err instanceof ApiError) showToast(failure, { error: err });
        else showToast("Logging food needs a connection. Nothing was saved: try again when you have one.");
        return false;
      }
    },
    [onSaved, showToast],
  );

  return useMemo(
    () => ({
      add: (date: string, add: FoodEntryAdd) =>
        write("Couldn't log that food", async () =>
          FoodEntry.parse(await api(`/days/${date}/food-entries`, { method: "POST", body: JSON.stringify(add) })),
        ),
      change: (id: string, change: FoodEntryChange) =>
        write("Couldn't change that food", () =>
          api(`/food-entries/${id}`, { method: "PATCH", body: JSON.stringify(change) }),
        ),
      remove: (id: string) =>
        write("Couldn't delete that food", () => api(`/food-entries/${id}`, { method: "DELETE" })),
    }),
    [api, write],
  );
}
