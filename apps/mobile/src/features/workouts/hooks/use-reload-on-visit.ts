import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { onComingToFront } from "../coming-to-front";
import { useLogbook } from "../logbook-provider";

// Keeps a screen's server data current: reloads on every visit, coming back to the front included (a screen left
// offline then shows the server once it answers again, NA1), and when a Pending Workout uploads and leaves the phone,
// since that can change what the server has. `reload` must be stable
export function useReloadOnVisit(reload: () => void) {
  const { pending } = useLogbook();

  useFocusEffect(
    useCallback(() => {
      reload();
      return onComingToFront(AppState, reload);
    }, [reload]),
  );

  const pendingCount = useRef(pending.length);
  useEffect(() => {
    if (pending.length < pendingCount.current) reload();
    pendingCount.current = pending.length;
  }, [pending.length, reload]);
}
