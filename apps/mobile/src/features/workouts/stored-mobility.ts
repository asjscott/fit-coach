import { MobilityFocus, MobilityMinutes, readStoredCopy, type DeviceStorage } from "@fit/engines";
import { z } from "zod";

const KEY = "workouts.mobility";

const StoredMobility = z.object({
  minutes: MobilityMinutes,
  focus: MobilityFocus,
  // The slugs of the last Mobility started, for the next to vary from
  lastExercises: z.array(z.string()),
});
export type StoredMobility = z.infer<typeof StoredMobility>;

const FIRST: StoredMobility = { minutes: 20, focus: "full_body", lastExercises: [] };

// The last Mobility's length, focus and Exercises, kept on the phone only. 20 minutes of Full body until the user
// chooses
export function createStoredMobility(storage: DeviceStorage) {
  return {
    read: async (): Promise<StoredMobility> => (await readStoredCopy(storage, KEY, StoredMobility)) ?? FIRST,
    keep: (mobility: StoredMobility) => storage.setItem(KEY, JSON.stringify(mobility)),
  };
}
