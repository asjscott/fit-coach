import { REST_CHOICES, type DeviceStorage } from "@fit/engines";
import { describe, expect, it } from "vitest";
import { createStoredRestChoice } from "./stored-rest-choice";

function memoryStorage(): DeviceStorage {
  const items = new Map<string, string>();
  return {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => void items.set(key, value),
    removeItem: async (key) => void items.delete(key),
  };
}

describe("the rest choice on the phone", () => {
  it("is Auto before the user chooses", async () => {
    expect(await createStoredRestChoice(memoryStorage()).read()).toBe("auto");
  });

  it.each(REST_CHOICES)("survives a restart on %s", async (choice) => {
    const storage = memoryStorage();
    await createStoredRestChoice(storage).keep(choice);

    expect(await createStoredRestChoice(storage).read()).toBe(choice);
  });

  it("is Auto when what's stored isn't a choice", async () => {
    const storage = memoryStorage();
    await storage.setItem("today.restChoice", "20");

    expect(await createStoredRestChoice(storage).read()).toBe("auto");
  });
});
