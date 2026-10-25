import type { Set } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { elapsedLabel, setsSummary, timeStat, weekDatesLabel } from "./format";

const loggedAt = "2026-10-24T09:00:00.000Z";
const kg = (kg: number, reps: number): Set => ({ kind: "external", kg, reps, loggedAt });
const reps = (reps: number): Set => ({ kind: "bodyweight", reps, loggedAt });
const seconds = (seconds: number): Set => ({ kind: "timed", seconds, loggedAt });

describe("setsSummary", () => {
  it("gives the reps once per weight", () => {
    expect(setsSummary([kg(18, 10), kg(18, 10), kg(18, 8)])).toBe("18 kg × 10, 10, 8");
  });

  it("starts again when the weight changes", () => {
    expect(setsSummary([kg(20, 10), kg(22.5, 8), kg(22.5, 6)])).toBe("20 kg × 10 · 22.5 kg × 8, 6");
  });

  it("lists reps or seconds with the unit once", () => {
    expect(setsSummary([reps(15), reps(12)])).toBe("15, 12 reps");
    expect(setsSummary([seconds(45), seconds(40)])).toBe("45, 40 s");
  });
});

describe("timeStat", () => {
  it("gives under an hour in minutes", () => {
    expect(timeStat(48.5 * 60_000)).toEqual({ value: "49", unit: "min" });
  });

  it("gives an hour or more as hours and minutes", () => {
    expect(timeStat(125 * 60_000)).toEqual({ value: "2:05", unit: "h" });
  });
});

describe("weekDatesLabel", () => {
  it("gives a week inside one month as its days and month", () => {
    expect(weekDatesLabel(new Date(2026, 9, 12), new Date(2026, 9, 24))).toBe("12–18 Oct");
  });

  it("names both months when the week crosses into the next", () => {
    expect(weekDatesLabel(new Date(2026, 9, 26), new Date(2026, 9, 29))).toBe("26 Oct – 1 Nov");
  });
});

const startedAt = "2026-10-25T09:00:00.000Z";
const at = (time: string) => new Date(`2026-10-25T${time}Z`);

describe("elapsedLabel", () => {
  it("counts the whole minutes since the Workout started", () => {
    expect(elapsedLabel(startedAt, at("09:12:59"))).toBe("12 min");
  });

  it("switches to hours after an hour", () => {
    expect(elapsedLabel(startedAt, at("10:05:00"))).toBe("1 h 5 min");
    expect(elapsedLabel(startedAt, at("11:00:30"))).toBe("2 h");
  });

  it("reads 0 min when the phone's clock is behind the start", () => {
    expect(elapsedLabel(startedAt, at("08:58:00"))).toBe("0 min");
  });
});
