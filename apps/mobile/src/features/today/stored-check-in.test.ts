import type { DeviceStorage } from "@fit/engines";
import { describe, expect, it } from "vitest";
import { createStoredCheckIn } from "./stored-check-in";

function memoryStorage(): DeviceStorage {
  const items = new Map<string, string>();
  return {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => void items.set(key, value),
    removeItem: async (key) => void items.delete(key),
  };
}

const checkIn = { sleep: 1, energy: 2, soreness: 5 };
const morning = new Date(2026, 10, 9, 7, 30);
const evening = new Date(2026, 10, 9, 22, 0);
const nextMorning = new Date(2026, 10, 10, 7, 30);

describe("today's check-in on the phone", () => {
  it("is null before the user checks in", async () => {
    expect(await createStoredCheckIn(memoryStorage()).read(morning)).toBeNull();
  });

  it("survives a restart the same day", async () => {
    const storage = memoryStorage();
    await createStoredCheckIn(storage).keep(checkIn, morning);

    expect(await createStoredCheckIn(storage).read(evening)).toEqual(checkIn);
  });

  it("is forgotten the next day", async () => {
    const storage = memoryStorage();
    await createStoredCheckIn(storage).keep(checkIn, morning);

    expect(await createStoredCheckIn(storage).read(nextMorning)).toBeNull();
  });

  it("is the latest one when the user changes it", async () => {
    const stored = createStoredCheckIn(memoryStorage());
    await stored.keep(checkIn, morning);
    await stored.keep({ sleep: 4, energy: 4, soreness: 2 }, evening);

    expect(await stored.read(evening)).toEqual({ sleep: 4, energy: 4, soreness: 2 });
  });

  it("is null when what's stored doesn't parse", async () => {
    const storage = memoryStorage();
    await storage.setItem("today.checkIn", JSON.stringify({ date: "2026-11-09", sleep: 9 }));

    expect(await createStoredCheckIn(storage).read(morning)).toBeNull();
  });
});
