import { Food, type SavedFoodInput } from "@fit/shared";
import { useCallback, useMemo } from "react";
import { ApiError, noAnswerMessage, useApi } from "@/api";
import { useToast } from "@/contexts/toast-context";

// What a scanned barcode found: a food (one of the user's Saved Foods, or from Open Food Facts or USDA), nothing, which
// is when Create food is offered, or no answer
export type BarcodeLookup = { food: Food } | { notFound: string } | { failed: true };

const NEEDS_CONNECTION = "Finding food needs a connection. Try again when you have one.";

// Barcode lookups and the user's Saved Foods, straight to the API (spec #158 stories 65 to 70). A write answers the
// Saved Food, true for a delete, or null when it didn't work, after a toast says why, so the form keeps what was typed
export function useSavedFoods() {
  const api = useApi();
  const { showToast } = useToast();

  const write = useCallback(
    async <T>(failure: string, request: () => Promise<T>): Promise<T | null> => {
      try {
        return await request();
      } catch (err) {
        if (!(err instanceof ApiError)) showToast(noAnswerMessage(err, NEEDS_CONNECTION));
        else if (err.status === 409) showToast("One of your Saved Foods already has that barcode.");
        else showToast(failure, { error: err });
        return null;
      }
    },
    [showToast],
  );

  return useMemo(
    () => ({
      lookup: async (code: string): Promise<BarcodeLookup> => {
        try {
          return { food: Food.parse(await api(`/foods/barcode/${encodeURIComponent(code)}`)) };
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) return { notFound: code };
          if (!(err instanceof ApiError)) showToast(noAnswerMessage(err, NEEDS_CONNECTION));
          else if (err.status === 502) showToast("Barcode lookup isn't answering. Try again in a minute.");
          else showToast("Couldn't look up that barcode", { error: err });
          return { failed: true };
        }
      },
      create: (input: SavedFoodInput) =>
        write("Couldn't save that food", async () =>
          Food.parse(await api("/saved-foods", { method: "POST", body: JSON.stringify(input) })),
        ),
      update: (id: string, input: SavedFoodInput) =>
        write("Couldn't save that food", async () =>
          Food.parse(await api(`/saved-foods/${id}`, { method: "PUT", body: JSON.stringify(input) })),
        ),
      remove: (id: string) =>
        write("Couldn't delete that food", async () => {
          await api(`/saved-foods/${id}`, { method: "DELETE" });
          return true;
        }),
    }),
    [api, showToast, write],
  );
}
