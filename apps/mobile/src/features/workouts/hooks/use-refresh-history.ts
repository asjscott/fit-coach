import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { useHistory } from "../history-provider";
import { useLogbook } from "../logbook-provider";

// Keeps a screen that shows History current: reloads on every visit, so a Workout just finished shows, and
// when a Pending Workout uploads and leaves the phone, so it shows from the server
export function useRefreshHistory() {
  const { refresh } = useHistory();
  const { pending } = useLogbook();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const pendingCount = useRef(pending.length);
  useEffect(() => {
    if (pending.length < pendingCount.current) refresh();
    pendingCount.current = pending.length;
  }, [pending.length, refresh]);
}
