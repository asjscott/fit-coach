import type { CheckIn } from "@fit/shared";
import { useCallback, useEffect, useState } from "react";
import { deviceStorage } from "@/features/workouts/device-storage";
import { useLogbook } from "@/features/workouts/logbook-provider";
import { localDateText } from "@/features/workouts/local-date-time";
import { createStoredCheckIn } from "../stored-check-in";
import type { CheckInState } from "../today-status";

const storedCheckIn = createStoredCheckIn(deviceStorage);

// Today's check-in from the phone: undefined until it's read, null before the user checks in. Checking in again
// replaces it, and the Day's Workout follows straight away. Each one is also queued to upload with the Pending
// Workouts, though Readiness only ever reads the phone's copy, so it works with no signal
export function useCheckIn() {
  const { queueCheckIn } = useLogbook();
  const [checkIn, setCheckIn] = useState<CheckIn | null | undefined>(undefined);

  useEffect(() => {
    storedCheckIn.read(new Date()).then(setCheckIn, () => setCheckIn(null));
  }, []);

  const keep = useCallback(
    (next: CheckIn) => {
      const now = new Date();
      setCheckIn(next);
      storedCheckIn.keep(next, now).catch(() => {});
      queueCheckIn({ ...next, date: localDateText(now), checkedInAt: now.toISOString() }).catch(() => {});
    },
    [queueCheckIn],
  );

  const state: CheckInState = checkIn === undefined ? "unread" : checkIn ? "checked-in" : "not-checked-in";
  return { checkIn, state, keep };
}
