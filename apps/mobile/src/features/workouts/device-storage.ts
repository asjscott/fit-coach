import type { DeviceStorage } from "@fit/engines";
import Storage from "expo-sqlite/kv-store";

// On the phone, the Logbook writes through SQLite so a killed app can't leave a half-written
// Workout (ADR 0001). Web uses device-storage.web.ts instead
export const deviceStorage: DeviceStorage = Storage;
