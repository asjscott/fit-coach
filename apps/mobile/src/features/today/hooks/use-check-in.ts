import type { CheckIn } from "@fit/engines";
import { useCallback, useEffect, useState } from "react";
import { deviceStorage } from "@/features/workouts/device-storage";
import { createStoredCheckIn } from "../stored-check-in";

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

  return { checkIn, keep };
}
