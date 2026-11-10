import { readStoredCopy, type DeviceStorage } from "@fit/engines";
import { CheckIn } from "@fit/shared";
import { z } from "zod";
import { localDateText } from "../workouts/local-date-time";

const KEY = "today.checkIn";

const StoredCheckIn = CheckIn.extend({ date: z.string() });

// Today's check-in, kept on the phone by the local date it was made on, so it lasts the day and nothing more. Nothing
// goes to the server
export function createStoredCheckIn(storage: DeviceStorage) {
  return {
    read: async (now: Date): Promise<CheckIn | null> => {
      const stored = await readStoredCopy(storage, KEY, StoredCheckIn);
      if (stored?.date !== localDateText(now)) return null;
      const { sleep, energy, soreness } = stored;
      return { sleep, energy, soreness };
    },
    keep: (checkIn: CheckIn, now: Date) =>
      storage.setItem(KEY, JSON.stringify({ ...checkIn, date: localDateText(now) })),
  };
}
