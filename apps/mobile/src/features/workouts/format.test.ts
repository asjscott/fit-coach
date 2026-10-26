import type { Set } from "@fit/shared";
import { describe, expect, it } from "vitest";
import {
  describeSet,
  durationLabel,
  elapsedClockLabel,
  elapsedLabel,
  previousSetsLabel,
  setParts,
  setsSummary,
  timeStat,
  weekDatesLabel,
  workoutExerciseSummary,
} from "./format";

const minutes = (n: number) => n * 60_000;

describe("elapsedLabel", () => {
  it("counts the whole minutes since the Workout started", () => {
    expect(elapsedLabel(minutes(12) + 59_000)).toBe("12 min");
  });

  it("reads as hours and minutes after an hour, like the Time Stat", () => {
    expect(elapsedLabel(minutes(65))).toBe("1:05 h");
    expect(elapsedLabel(minutes(120) + 30_000)).toBe("2:00 h");
  });

  it("reads 0 min when the phone's clock is behind the start", () => {
    expect(elapsedLabel(-minutes(2))).toBe("0 min");
  });
});

describe("durationLabel", () => {
  it("gives a finished Workout's length to the nearest minute", () => {
    const startedAt = "2026-10-25T09:00:00.000Z";
    expect(durationLabel({ startedAt, endedAt: "2026-10-25T09:48:30.000Z" })).toBe("49 min");
    expect(durationLabel({ startedAt, endedAt: "2026-10-25T11:05:00.000Z" })).toBe("2:05 h");
  });
});

describe("elapsedClockLabel", () => {
  it("reads as minutes and seconds, then hours", () => {
    expect(elapsedClockLabel(0)).toBe("0:00");
    expect(elapsedClockLabel(65_000)).toBe("1:05");
    expect(elapsedClockLabel((48 * 60 + 12) * 1000 + 999)).toBe("48:12");
    expect(elapsedClockLabel((3600 + 5 * 60 + 9) * 1000)).toBe("1:05:09");
  });

  it("shows a start in the future (a clock change) as zero", () => {
    expect(elapsedClockLabel(-5000)).toBe("0:00");
  });
});

const loggedAt = "2026-10-24T09:05:00.000Z";
const lifted = (kg: number, reps: number): Set => ({ kind: "external", kg, reps, loggedAt });

describe("setsSummary", () => {
  it("says the weight once when every Set used it", () => {
    expect(setsSummary([lifted(18, 10), lifted(18, 10), lifted(18, 8)])).toBe("18 kg × 10, 10, 8");
  });

  it("gives each Set its weight when the weight changed", () => {
    expect(setsSummary([lifted(16, 10), lifted(18.5, 8)])).toBe("16 kg × 10, 18.5 kg × 8");
  });

  it("lists reps or seconds with the unit once", () => {
    const reps = (n: number): Set => ({ kind: "bodyweight", reps: n, loggedAt });
    const hold = (seconds: number): Set => ({ kind: "timed", seconds, loggedAt });
    expect(setsSummary([reps(12), reps(10)])).toBe("12, 10 reps");
    expect(setsSummary([hold(45)])).toBe("45 s");
  });

  it("is empty with no Sets", () => {
    expect(setsSummary([])).toBe("");
  });
});

describe("workoutExerciseSummary", () => {
  it("counts the Sets before summarising them", () => {
    expect(workoutExerciseSummary([lifted(18, 10), lifted(18, 8)])).toBe("2 sets · 18 kg × 10, 8");
    expect(workoutExerciseSummary([lifted(18, 10)])).toBe("1 set · 18 kg × 10");
  });

  it("says when nothing is logged yet", () => {
    expect(workoutExerciseSummary([])).toBe("Not started");
  });

  it("shows the Previous Sets until something is logged", () => {
    const previous = [lifted(18, 10), lifted(18, 10), lifted(18, 8)];
    expect(workoutExerciseSummary([], previous)).toBe("Last: 18 kg × 10, 10, 8");
    expect(workoutExerciseSummary([lifted(20, 6)], previous)).toBe("1 set · 20 kg × 6");
  });
});

describe("previousSetsLabel", () => {
  it("reads like the Sets summary, after Last", () => {
    expect(previousSetsLabel([lifted(18, 10), lifted(18, 10), lifted(18, 8)])).toBe("Last: 18 kg × 10, 10, 8");
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
  // The range's dash always sits between thin spaces, whatever spacing the engine's Intl data uses
  const range = "\u2009–\u2009";
  const now = new Date(2026, 10, 3);

  it("gives a week inside one month as its days and month", () => {
    expect(weekDatesLabel(new Date(2026, 9, 12), now, "en-GB")).toBe(`12${range}18 Oct`);
  });

  it("names both months when the week crosses into the next", () => {
    expect(weekDatesLabel(new Date(2026, 9, 26), now, "en-GB")).toBe(`26 Oct${range}1 Nov`);
  });

  it("orders the day and month as the user's locale does", () => {
    expect(weekDatesLabel(new Date(2026, 9, 12), now, "en-US")).toBe(`Oct 12${range}18`);
    expect(weekDatesLabel(new Date(2026, 9, 26), now, "en-US")).toBe(`Oct 26${range}Nov 1`);
  });

  it("adds the year to a week from another year", () => {
    expect(weekDatesLabel(new Date(2025, 11, 29), now, "en-GB")).toBe(`29 Dec 2025${range}4 Jan 2026`);
  });
});

describe("describeSet", () => {
  it("reads a Set as its Load Type records it", () => {
    expect(describeSet(lifted(16, 10))).toBe("16 kg × 10");
    expect(describeSet({ kind: "bodyweight", reps: 12, loggedAt })).toBe("12 reps");
    expect(describeSet({ kind: "timed", seconds: 45, loggedAt })).toBe("45 s");
  });
});

describe("setParts", () => {
  it("splits a Set into numbers and the units after them", () => {
    expect(setParts(lifted(16, 10))).toEqual([
      [16, "kg ×"],
      [10, ""],
    ]);
    expect(setParts({ kind: "timed", seconds: 45, loggedAt })).toEqual([[45, "s"]]);
  });
});
