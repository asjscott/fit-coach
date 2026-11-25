import { Food, type SavedMealInput } from "@fit/shared";
import * as Crypto from "expo-crypto";
import { useCallback, useMemo, useRef } from "react";
import { ApiError, noAnswerMessage, useApi } from "@/api";
import { useToast } from "@/contexts/toast-context";

const NEEDS_CONNECTION = "Saving needs a connection. Nothing was saved: try again when you have one.";

// Making, editing and deleting the user's Saved Meals, straight to the API (spec #188). Each answers the Saved Meal as
// a food to log, true for a delete, or null when it didn't work, after a toast says why, so the form keeps what was
// typed
export function useSavedMeals() {
  const api = useApi();
  const { showToast } = useToast();
  // The request id of the last create not yet known to have worked, so sending the same one again makes one Saved Meal
  const pending = useRef<{ content: string; requestId: string } | null>(null);

  const write = useCallback(
    async <T>(failure: string, request: () => Promise<T>): Promise<T | null> => {
      try {
        return await request();
      } catch (err) {
        if (err instanceof ApiError) showToast(failure, { error: err });
        else showToast(noAnswerMessage(err, NEEDS_CONNECTION));
        return null;
      }
    },
    [showToast],
  );

  return useMemo(
    () => ({
      create: (input: SavedMealInput) =>
        write("Couldn't save that Saved Meal", async () => {
          const content = JSON.stringify(input);
          if (pending.current?.content !== content) pending.current = { content, requestId: Crypto.randomUUID() };
          const body = JSON.stringify({ ...input, requestId: pending.current.requestId });
          const food = Food.parse(await api("/saved-meals", { method: "POST", body }));
          pending.current = null;
          return food;
        }),
      update: (id: string, input: SavedMealInput) =>
        write("Couldn't save that Saved Meal", async () =>
          Food.parse(await api(`/saved-meals/${id}`, { method: "PUT", body: JSON.stringify(input) })),
        ),
      remove: (id: string) =>
        write("Couldn't delete that Saved Meal", async () => {
          await api(`/saved-meals/${id}`, { method: "DELETE" });
          return true;
        }),
    }),
    [api, write],
  );
}
