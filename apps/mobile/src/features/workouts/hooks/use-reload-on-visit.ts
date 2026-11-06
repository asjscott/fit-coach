import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { useLogbook } from "../logbook-provider";

// Keeps a screen's server data current: reloads on every visit, and when a Pending Workout uploads and leaves the
// phone, since that can change what the server has. `reload` must be stable
export function useReloadOnVisit(reload: () => void) {
  const { pending } = useLogbook();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const pendingCount = useRef(pending.length);
  useEffect(() => {
    if (pending.length < pendingCount.current) reload();
    pendingCount.current = pending.length;
  }, [pending.length, reload]);
}
