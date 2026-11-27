import { readStoredCopy, RestChoice, type DeviceStorage } from "@fit/engines";

const KEY = "today.restChoice";

// The rest chosen in the Next Workout sheet, kept on the phone for every Workout until it's changed. Auto until the user chooses
export function createStoredRestChoice(storage: DeviceStorage) {
  return {
    read: async (): Promise<RestChoice> => (await readStoredCopy(storage, KEY, RestChoice)) ?? "auto",
    keep: (choice: RestChoice) => storage.setItem(KEY, JSON.stringify(choice)),
  };
}
