import type { DeviceStorage } from "@fit/engines";
import { describe, expect, it } from "vitest";
import { createStoredMobility, type StoredMobility } from "./stored-mobility";

function memoryStorage(): DeviceStorage {
  const items = new Map<string, string>();
  return {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => void items.set(key, value),
    removeItem: async (key) => void items.delete(key),
  };
}

const FIRST = { minutes: 20, focus: "full_body", lastExercises: [] };

describe("the last Mobility on the phone", () => {
  it("is 20 minutes of Full body, with nothing to vary from, before the first", async () => {
    expect(await createStoredMobility(memoryStorage()).read()).toEqual(FIRST);
  });

  it("survives a restart", async () => {
    const storage = memoryStorage();
    const chosen: StoredMobility = { minutes: 30, focus: "back_and_shoulders", lastExercises: ["cobra"] };
    await createStoredMobility(storage).keep(chosen);

    expect(await createStoredMobility(storage).read()).toEqual(chosen);
  });

  it("starts over when what's stored isn't a choice", async () => {
    const storage = memoryStorage();
    await storage.setItem("workouts.mobility", JSON.stringify({ ...FIRST, minutes: 15 }));

    expect(await createStoredMobility(storage).read()).toEqual(FIRST);
  });
});
