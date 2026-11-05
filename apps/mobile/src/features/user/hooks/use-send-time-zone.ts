import type { User, UserUpdate } from "@fit/shared";
import { getCalendars } from "expo-localization";
import { useEffect } from "react";
import { AppState } from "react-native";

// Keeps the server's copy of the phone's timezone current, so its weeks match Today's (ADR 0003): when the user loads
// and on returning to the foreground, for a phone that has travelled. A failure waits for the next of those
export function useSendTimeZone(user: User | null, updateUser: (update: UserUpdate) => Promise<User>) {
  useEffect(() => {
    if (!user) return;
    const send = () => {
      const { timeZone } = getCalendars()[0];
      if (timeZone && timeZone !== user.timeZone) updateUser({ timeZone }).catch(() => {});
    };
    send();
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") send();
    });
    return () => appState.remove();
  }, [user, updateUser]);
}
