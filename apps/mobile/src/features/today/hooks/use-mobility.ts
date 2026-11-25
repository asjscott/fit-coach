import { mobilityWorkout, NO_EQUIPMENT, withPending, type MobilityFocus, type MobilityMinutes } from "@fit/engines";
import { useEffect, useState } from "react";
import { useCurrentUser, usePrimaryEquipmentProfile } from "@/features/user/current-user-provider";
import { deviceStorage } from "@/features/workouts/device-storage";
import { useHistory } from "@/features/workouts/history-provider";
import { useLogbook } from "@/features/workouts/logbook-provider";
import { createStoredMobility, type StoredMobility } from "@/features/workouts/stored-mobility";

const storedMobility = createStoredMobility(deviceStorage);

// The Mobility Workout the app would pick, for the length and focus kept on the phone. `now` is when it's shown, so the
// list stays put while it's read. Offline it knows only the Workouts on the phone (ADR 0001), so it leans on those
export function useMobility(now: Date) {
  // null until it's been read from the phone
  const [stored, setStored] = useState<StoredMobility | null>(null);
  const { workouts } = useHistory();
  const { pending } = useLogbook();
  const equipmentProfile = usePrimaryEquipmentProfile() ?? NO_EQUIPMENT;
  const injuries = useCurrentUser().user?.profile.injuries ?? [];

  useEffect(() => {
    storedMobility.read().then(setStored, () => {});
  }, []);

  const keep = (changes: Partial<StoredMobility>) => {
    if (!stored) return;
    const next = { ...stored, ...changes };
    setStored(next);
    storedMobility.keep(next).catch(() => {});
  };

  return {
    stored,
    holds: stored
      ? mobilityWorkout({ ...stored, workouts: withPending(pending, workouts), injuries, equipmentProfile, now })
      : [],
    chooseMinutes: (minutes: MobilityMinutes) => keep({ minutes }),
    chooseFocus: (focus: MobilityFocus) => keep({ focus }),
    // Once it starts, for the next to vary from
    keepExercises: (lastExercises: string[]) => keep({ lastExercises }),
  };
}
