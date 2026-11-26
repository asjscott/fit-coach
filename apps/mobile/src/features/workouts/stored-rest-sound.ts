import { readStoredCopy, type DeviceStorage } from "@fit/engines";
import { z } from "zod";

const KEY = "workouts.restSound";

// Whether a rest beeps as it ends (#179), kept on the phone. On until the user turns it off
export function createStoredRestSound(storage: DeviceStorage) {
  return {
    read: async (): Promise<boolean> => (await readStoredCopy(storage, KEY, z.boolean())) ?? true,
    keep: (on: boolean) => storage.setItem(KEY, JSON.stringify(on)),
  };
}
