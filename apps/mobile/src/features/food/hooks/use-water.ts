import { WaterDay } from "@fit/shared";
import { useCallback } from "react";
import { ApiError, useApi } from "@/api";
import { useToast } from "@/contexts/toast-context";

// Sets a date's water to a total, straight to the API: like Food Entries there's no queue, so it needs a connection.
// Answers whether it worked; when it didn't, a toast says why
export function useWater() {
  const api = useApi();
  const { showToast } = useToast();

  return useCallback(
    async (date: string, waterMl: number) => {
      try {
        WaterDay.parse(await api(`/days/${date}/water`, { method: "PUT", body: JSON.stringify({ waterMl }) }));
        return true;
      } catch (err) {
        if (err instanceof ApiError) showToast("Couldn't log that water", { error: err });
        else showToast("Logging water needs a connection. Nothing was saved: try again when you have one.");
        return false;
      }
    },
    [api, showToast],
  );
}
