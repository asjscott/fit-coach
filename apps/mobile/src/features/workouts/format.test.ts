import type { Set } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { elapsedLabel, setsSummary, workoutExerciseSummary } from "./format";

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
});

describe("elapsedLabel", () => {
  it("reads as minutes and seconds, then hours", () => {
    expect(elapsedLabel(0)).toBe("0:00");
    expect(elapsedLabel(65_000)).toBe("1:05");
    expect(elapsedLabel((48 * 60 + 12) * 1000 + 999)).toBe("48:12");
    expect(elapsedLabel((3600 + 5 * 60 + 9) * 1000)).toBe("1:05:09");
  });

  it("shows a start in the future (a clock change) as zero", () => {
    expect(elapsedLabel(-5000)).toBe("0:00");
  });
});
