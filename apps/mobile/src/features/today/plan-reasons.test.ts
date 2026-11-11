import type { Muscle, PlanReason } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { planReasonLines, progressionChangeLine } from "./plan-reasons";

// Wednesday 4 November 2026, in the phone's own time
const wednesday = new Date(2026, 10, 4, 12);
const lines = (reasons: PlanReason[] | undefined) => planReasonLines(reasons, wednesday);

const recovering = (muscles: Muscle[], lastSetOn = "2026-11-02"): PlanReason => ({
  code: "recovering",
  muscles,
  lastSetOn,
});
const behind = (muscles: Muscle[]): PlanReason => ({ code: "behind", muscles });

// Story 42, #132: why an Exercise's Working Level changed, under the Exercise
describe("progressionChangeLine", () => {
  it.each([
    [{ code: "target-up" }, "One more rep: every Set reached the target."],
    [{ code: "load-up" }, "Heavier: every Set reached the top of the range."],
    [{ code: "new-base" }, "From the weight you lifted last time."],
    // Stories 47–49, #134
    [{ code: "load-down" }, "Lighter: the last two times fell short of the target."],
    [{ code: "target-down" }, "Fewer: the last two times fell short of the target."],
    [{ code: "harder-variant", from: "goblet-squat" }, "Ready for this after Goblet squat."],
    [{ code: "held-at-top" }, "Held at 20 reps: no heavier weight or harder variant here."],
    // Story 44
    [{ code: "rpe-10" }, "Held: your last Set was RPE 10, all you had."],
  ] as const)("words %o", (change, line) => {
    expect(progressionChangeLine(change)).toBe(line);
  });

  it("says nothing when nothing changed", () => {
    expect(progressionChangeLine(undefined)).toBeNull();
  });
});

describe("planReasonLines", () => {
  it("says which group is recovering, and from which day", () => {
    expect(lines([recovering(["quads", "glutes"])])).toEqual(["Legs are recovering from Monday."]);
  });

  it("says today when the last Set was today", () => {
    expect(lines([recovering(["chest"], "2026-11-04")])).toEqual(["Chest is recovering from today."]);
  });

  it("says when the week's work is done", () => {
    expect(lines([{ code: "budget-met" }])).toEqual(["This week's work is done. This one's extra."]);
  });

  it("names the group furthest behind", () => {
    expect(lines([behind(["lats", "upper_back"])])).toEqual(["Back is furthest behind this week."]);
  });

  it.each([
    [["quads", "hamstrings", "glutes"], "Legs are"],
    [["lats", "upper_back"], "Back is"],
    [["chest"], "Chest is"],
    [["side_delts"], "Shoulders are"],
    [["abs"], "Core is"],
  ] as const)("names %j as a group: %s", (muscles, words) => {
    expect(lines([behind([...muscles])])[0]).toBe(`${words} furthest behind this week.`);
  });

  it("names each group once, in the order of the groups", () => {
    expect(lines([recovering(["abs", "upper_back", "lats", "quads"])])).toEqual([
      "Legs, Back and Core are recovering from Monday.",
    ]);
  });

  it("leaves out Muscles in no group", () => {
    expect(lines([recovering(["triceps", "chest"])])).toEqual(["Chest is recovering from Monday."]);
    expect(lines([recovering(["triceps"])])).toEqual([]);
  });

  it("puts recovering first, then budget met, then behind, whatever order they're stored in", () => {
    expect(lines([behind(["abs"]), { code: "budget-met" }, recovering(["quads"])])).toEqual([
      "Legs are recovering from Monday.",
      "This week's work is done. This one's extra.",
      "Core is furthest behind this week.",
    ]);
  });

  it("gives nothing for a plan stored without reasons", () => {
    expect(lines(undefined)).toEqual([]);
    expect(lines([])).toEqual([]);
  });
});
