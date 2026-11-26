import type { DeviceStorage } from "@fit/engines";
import { expect, it } from "vitest";
import { createStoredGuide } from "./stored-guide";

function memoryStorage(): DeviceStorage {
  const items = new Map<string, string>();
  return {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => void items.set(key, value),
    removeItem: async (key) => void items.delete(key),
  };
}

it("knows after a restart which Workout's guided flow was open, until it's left", async () => {
  const storage = memoryStorage();
  expect(await createStoredGuide(storage).read()).toBeNull();

  await createStoredGuide(storage).keep("w1");
  expect(await createStoredGuide(storage).read()).toBe("w1");

  await createStoredGuide(storage).clear();
  expect(await createStoredGuide(storage).read()).toBeNull();
});
