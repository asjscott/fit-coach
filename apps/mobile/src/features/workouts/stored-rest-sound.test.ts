import type { DeviceStorage } from "@fit/engines";
import { describe, expect, it } from "vitest";
import { createStoredRestSound } from "./stored-rest-sound";

function memoryStorage(): DeviceStorage {
  const items = new Map<string, string>();
  return {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => void items.set(key, value),
    removeItem: async (key) => void items.delete(key),
  };
}

describe("the rest's sound on the phone", () => {
  it("is on before the user turns it off", async () => {
    expect(await createStoredRestSound(memoryStorage()).read()).toBe(true);
  });

  it.each([false, true])("survives a restart on %s", async (on) => {
    const storage = memoryStorage();
    await createStoredRestSound(storage).keep(on);

    expect(await createStoredRestSound(storage).read()).toBe(on);
  });

  it("is on when what's stored isn't a choice", async () => {
    const storage = memoryStorage();
    await storage.setItem("workouts.restSound", '"loud"');

    expect(await createStoredRestSound(storage).read()).toBe(true);
  });
});
