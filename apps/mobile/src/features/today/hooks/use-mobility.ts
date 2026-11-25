import {
  alternativeHolds,
  mobilityWorkout,
  NO_EQUIPMENT,
  removeHold,
  swapHold,
  withPending,
  type MobilityFocus,
  type MobilityMinutes,
  type RecoveryExercise,
} from "@fit/engines";
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
  // The list once the user has changed it, for this showing, length and focus only
  const [changed, setChanged] = useState<{ now: Date; holds: RecoveryExercise[] } | null>(null);
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

  const pick = () =>
    stored
      ? mobilityWorkout({ ...stored, workouts: withPending(pending, workouts), injuries, equipmentProfile, now })
      : [];
  const holds = changed?.now === now ? changed.holds : pick();

  return {
    stored,
    holds,
    // Choosing again picks again, so it drops any changes
    chooseMinutes: (minutes: MobilityMinutes) => {
      setChanged(null);
      keep({ minutes });
    },
    chooseFocus: (focus: MobilityFocus) => {
      setChanged(null);
      keep({ focus });
    },
    alternativesTo: (slug: string) => alternativeHolds({ slug, holds, injuries, equipmentProfile }),
    swap: (slug: string, toSlug: string) => setChanged({ now, holds: swapHold(holds, slug, toSlug) }),
    remove: (slug: string) => setChanged({ now, holds: removeHold(holds, slug) }),
    // Once it starts, for the next to vary from
    keepExercises: (lastExercises: string[]) => keep({ lastExercises }),
  };
}
