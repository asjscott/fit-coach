import { readStoredCopy, type DeviceStorage } from "@fit/engines";
import { z } from "zod";

const KEY = "workouts.guide";

// The Workout whose guided flow is open, kept on the phone so it reopens after the app is killed (#201)
export function createStoredGuide(storage: DeviceStorage) {
  return {
    read: () => readStoredCopy(storage, KEY, z.string()),
    keep: (workoutId: string) => storage.setItem(KEY, JSON.stringify(workoutId)),
    clear: () => storage.removeItem(KEY),
  };
}
