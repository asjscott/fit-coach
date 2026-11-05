import type { DeviceStorage } from "@fit/engines";
import { User } from "@fit/shared";

const KEY = "current-user";

// The last User the server gave, so the app opens with no signal: its gate needs a User, and the Planned Workout needs
// the Goal and usual Workout Length. A copy an older version of the app wrote can fail to parse, which counts as none
export function createStoredUser(storage: DeviceStorage) {
  return {
    read: async () => {
      const json = await storage.getItem(KEY);
      return json === null ? null : (User.safeParse(JSON.parse(json)).data ?? null);
    },
    keep: (user: User) => storage.setItem(KEY, JSON.stringify(user)),
    forget: () => storage.removeItem(KEY),
  };
}
