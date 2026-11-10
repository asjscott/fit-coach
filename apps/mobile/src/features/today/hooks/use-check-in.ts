import type { CheckIn } from "@fit/shared";
import { useCallback, useEffect, useState } from "react";
import { deviceStorage } from "@/features/workouts/device-storage";
import { createStoredCheckIn } from "../stored-check-in";
import type { CheckInState } from "../today-status";

const storedCheckIn = createStoredCheckIn(deviceStorage);

// Today's check-in from the phone: undefined until it's read, null before the user checks in. Checking in again
// replaces it, and the Day's Workout follows straight away
export function useCheckIn() {
  const [checkIn, setCheckIn] = useState<CheckIn | null | undefined>(undefined);

  useEffect(() => {
    storedCheckIn.read(new Date()).then(setCheckIn, () => setCheckIn(null));
  }, []);

  const keep = useCallback((next: CheckIn) => {
    setCheckIn(next);
    storedCheckIn.keep(next, new Date()).catch(() => {});
  }, []);

  const state: CheckInState = checkIn === undefined ? "unread" : checkIn ? "checked-in" : "not-checked-in";
  return { checkIn, state, keep };
}
