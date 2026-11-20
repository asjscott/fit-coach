import { CopiedFoodEntries, FoodEntry, type FoodEntryAdd, type FoodEntryChange, type Meal } from "@fit/shared";
import * as Crypto from "expo-crypto";
import { useCallback, useMemo, useRef } from "react";
import { ApiError, noAnswerMessage, useApi } from "@/api";
import { useToast } from "@/contexts/toast-context";

// Logging, changing and deleting Food Entries, straight to the API: there's no queue, so each needs a connection
// (spec #158 story 78). Each answers whether it worked; when it didn't, a toast says why and the caller keeps what
// the user chose, so nothing they typed is lost. `onSaved` runs after each one that worked, to reload the day
export function useFoodEntries(onSaved: () => void) {
  const api = useApi();
  const { showToast } = useToast();
  // A request id per write not yet known to have worked, so trying the same one again after its answer was lost
  // logs nothing twice. Dropped once it works, so doing the same thing again later is a new write
  const pending = useRef(new Map<string, string>());
  const requestIdOf = useCallback((write: string) => {
    const known = pending.current.get(write);
    if (known) return known;
    const made = Crypto.randomUUID();
    pending.current.set(write, made);
    return made;
  }, []);

  const write = useCallback(
    async (failure: string, request: () => Promise<unknown>) => {
      try {
        await request();
        onSaved();
        return true;
      } catch (err) {
        if (err instanceof ApiError) showToast(failure, { error: err });
        else
          showToast(
            noAnswerMessage(err, "Logging food needs a connection. Nothing was saved: try again when you have one."),
          );
        return false;
      }
    },
    [onSaved, showToast],
  );

  return useMemo(
    () => ({
      add: (date: string, add: FoodEntryAdd) => {
        const key = JSON.stringify(["add", date, add]);
        return write("Couldn't log that food", async () => {
          const body = JSON.stringify({ ...add, requestId: requestIdOf(key) });
          FoodEntry.parse(await api(`/days/${date}/food-entries`, { method: "POST", body }));
          pending.current.delete(key);
        });
      },
      // Copy from yesterday (spec #158 stories 52 to 54). Says so when the day before had nothing in that meal
      copy: (date: string, meal: Meal) => {
        const key = JSON.stringify(["copy", date, meal]);
        return write("Couldn't copy that meal", async () => {
          const body = JSON.stringify({ requestId: requestIdOf(key) });
          const { entries } = CopiedFoodEntries.parse(
            await api(`/days/${date}/meals/${meal}/copy-from-yesterday`, { method: "POST", body }),
          );
          pending.current.delete(key);
          if (!entries.length) showToast(`Nothing was logged in ${meal} the day before.`, { type: "info" });
        });
      },
      change: (id: string, change: FoodEntryChange) =>
        write("Couldn't change that food", () =>
          api(`/food-entries/${id}`, { method: "PATCH", body: JSON.stringify(change) }),
        ),
      remove: (id: string) =>
        write("Couldn't delete that food", () => api(`/food-entries/${id}`, { method: "DELETE" })),
    }),
    [api, requestIdOf, showToast, write],
  );
}
