import type { DeviceStorage } from "@fit/engines";
import type { User } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { createStoredUser } from "./stored-user";

function memoryStorage(): DeviceStorage {
  const items = new Map<string, string>();
  return {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => void items.set(key, value),
    removeItem: async (key) => void items.delete(key),
  };
}

const user: User = {
  id: "user-1",
  profile: { goal: "athletic", workoutLength: "short", daysPerWeek: 4 },
  onboardedAt: "2026-10-01T09:00:00.000Z",
  equipmentProfiles: [],
};

describe("the User on the phone", () => {
  it("has none until one is kept", async () => {
    expect(await createStoredUser(memoryStorage()).read()).toBeNull();
  });

  it("gives back the kept User, with the Goal and usual Workout Length a cold start offline needs", async () => {
    const storage = memoryStorage();
    await createStoredUser(storage).keep(user);

    expect(await createStoredUser(storage).read()).toEqual(user);
  });

  it("treats a copy this version of the app can't read as none", async () => {
    const storage = memoryStorage();
    await storage.setItem("current-user", JSON.stringify({ id: 7 }));

    expect(await createStoredUser(storage).read()).toBeNull();
  });

  it("forgets the User on sign-out", async () => {
    const stored = createStoredUser(memoryStorage());
    await stored.keep(user);

    await stored.forget();

    expect(await stored.read()).toBeNull();
  });
});
