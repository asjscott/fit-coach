import { localDateOf } from "@fit/engines";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { AppState } from "react-native";
import { useTimeZone } from "@/features/user/current-user-provider";
import { onComingToFront } from "@/features/workouts/coming-to-front";

const CHECK_MS = 30_000;

// Keeps a screen left open right about today: reloads once it's past midnight in the user's timezone. Only while the
// screen is in front, as a visit reloads it anyway. Use it with useReloadOnVisit. `reload` must be stable
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
      // useReloadOnVisit reloads on coming back to the front, covering a midnight passed in the background
      const stop = onComingToFront(AppState, () => {
        today = localDateOf(new Date(), timeZone);
      });
      return () => {
        clearInterval(timer);
        stop();
      };
    }, [reload, timeZone]),
  );
}
