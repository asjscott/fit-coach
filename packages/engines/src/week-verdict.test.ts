import { describe, expect, it } from "vitest";
import { weekVerdict, type WeekVerdictInput } from "./week-verdict";

// A full week of 3 Workouts with nothing else known
const week = (input: Partial<WeekVerdictInput> = {}): WeekVerdictInput => ({
  workouts: { done: 3, planned: 3 },
  partWeek: false,
  prs: 0,
  deload: false,
  unit: "kg",
  ...input,
});

describe("weekVerdict", () => {
  it("calls a week with every Workout done a full week", () => {
    expect(weekVerdict(week())).toEqual({ sentence: "A full week.", line: "Every Workout done." });
  });

  it("names the PRs of a full week", () => {
    expect(weekVerdict(week({ prs: 2, kcal: "in", protein: "in", weighInChangeKg: -0.4 }))).toEqual({
      sentence: "A full week, and two PRs.",
      line: "Every Workout done, food in range on average, and 0.4 kg down.",
    });
    expect(weekVerdict(week({ prs: 1 })).sentence).toBe("A full week, and a PR.");
  });

  it("calls a week short of its Workouts a short week, saying how short", () => {
    expect(weekVerdict(week({ workouts: { done: 1, planned: 3 }, kcal: "below" }))).toEqual({
      sentence: "A short week.",
      line: "1 of 3 Workouts done, and calories under on average.",
    });
  });

  it("still names the PRs of a short week", () => {
    expect(weekVerdict(week({ workouts: { done: 2, planned: 4 }, prs: 3 })).sentence).toBe(
      "A short week, but three PRs.",
    );
  });

  it("says plainly when nothing at all was logged", () => {
    expect(weekVerdict(week({ workouts: { done: 0, planned: 3 } }))).toEqual({
      sentence: "A quiet week.",
      line: "No Workouts or food logged. A new week starts Monday.",
    });
  });

  it("says a week with food but no Workouts had none", () => {
    expect(weekVerdict(week({ workouts: { done: 0, planned: 3 }, kcal: "over", protein: "in" }))).toEqual({
      sentence: "No Workouts this week.",
      line: "0 of 3 Workouts done, and calories over on average.",
    });
  });

  it("puts a deload week first, as lighter on purpose", () => {
    expect(weekVerdict(week({ deload: true, prs: 1, workouts: { done: 2, planned: 3 } }))).toEqual({
      sentence: "A deload week, lighter on purpose.",
      line: "2 of 3 Workouts done.",
    });
  });

  it("calls a short part first week a first week to build on", () => {
    expect(weekVerdict(week({ partWeek: true, workouts: { done: 1, planned: 2 } })).sentence).toBe(
      "A first week to build on.",
    );
  });

  it("says when protein fell short of food otherwise in range", () => {
    expect(weekVerdict(week({ kcal: "in", protein: "below" })).line).toBe(
      "Every Workout done, and calories in range but protein short.",
    );
  });

  it("gives the weight change in the user's unit, and calls a tiny one steady", () => {
    expect(weekVerdict(week({ weighInChangeKg: 0.9, unit: "lb" })).line).toBe("Every Workout done, and 2 lb up.");
    expect(weekVerdict(week({ weighInChangeKg: 0.02 })).line).toBe("Every Workout done, and weight steady.");
  });
});
