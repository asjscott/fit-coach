import { readStoredCopy, type DeviceStorage } from "@fit/engines";
import { User } from "@fit/shared";

const KEY = "current-user";

// The last User the server gave, so the app opens with no signal: its gate needs a User, and the Planned Workout needs
// the Goal and usual Workout Length
export function createStoredUser(storage: DeviceStorage) {
  return {
    read: () => readStoredCopy(storage, KEY, User),
    keep: (user: User) => storage.setItem(KEY, JSON.stringify(user)),
    forget: () => storage.removeItem(KEY),
  };
}
