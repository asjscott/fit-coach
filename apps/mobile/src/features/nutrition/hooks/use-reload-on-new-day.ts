import { localDateOf } from "@fit/engines";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { AppState } from "react-native";
import { useTimeZone } from "@/features/user/current-user-provider";

const CHECK_MS = 30_000;

// Keeps a screen left open right about today: reloads on returning to the foreground, and once it's past midnight in
// the user's timezone. Only while the screen is in front, as a visit reloads it anyway. `reload` must be stable
export function useReloadOnNewDay(reload: () => void) {
  const timeZone = useTimeZone();

  useFocusEffect(
    useCallback(() => {
      let today = localDateOf(new Date(), timeZone);
      const timer = setInterval(() => {
        const now = localDateOf(new Date(), timeZone);
        if (now === today) return;
        today = now;
        reload();
      }, CHECK_MS);
      const appState = AppState.addEventListener("change", (state) => {
        if (state !== "active") return;
        today = localDateOf(new Date(), timeZone);
        reload();
      });
      return () => {
        clearInterval(timer);
        appState.remove();
      };
    }, [reload, timeZone]),
  );
}
