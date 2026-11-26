import type { WeekSummary } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { budgetPart, dayBars, progressRows, weekSummaryTiles } from "./week-summary-screen";

const week = (parts: Partial<WeekSummary> = {}): WeekSummary => ({
  monday: "2026-11-23",
  sunday: "2026-11-29",
  seen: true,
  partWeek: false,
  workouts: { done: 3, planned: 3 },
  streak: 4,
  coach: { sentence: "A full week.", line: "Every Workout done." },
  ...parts,
});

// Spec #206 story 49, prototype variant B: Workouts, streak, kcal and protein a day, Weigh-in change, Readiness
describe("weekSummaryTiles", () => {
  it("shows a tile for each part, worded as the prototype's", () => {
    const summary = week({
      kcal: { average: 2870, min: 2720, max: 3010, state: "in", days: [] },
      protein: { average: 171, min: 144, max: 192, state: "in" },
      weighIn: { kg: 79.6, changeKg: -0.4 },
      readiness: { average: 11.2, previous: 10.4 },
    });
    expect(weekSummaryTiles(summary, "kg")).toEqual([
      { big: "3/3", label: "Workouts", tone: "success" },
      { big: "🔥 4", label: "Week streak", tone: "text" },
      { big: "2,870", label: "kcal a day · in range", tone: "success" },
      { big: "171 g", label: "protein a day · in range", tone: "success" },
      { big: "−0.4 kg", label: "since last Weigh-in", tone: "text" },
      { big: "11.2", label: "Readiness · ↑ 0.8", tone: "text" },
    ]);
  });

  it("leaves out the parts with no data, and a streak of zero", () => {
    expect(weekSummaryTiles(week({ workouts: { done: 1, planned: 3 }, streak: 0 }), "lb")).toEqual([
      { big: "1/3", label: "Workouts", tone: "accent" },
    ]);
  });

  it("says food under or over its range, a gain in the user's unit, and Readiness without a week before", () => {
    const summary = week({
      kcal: { average: 2040, min: 2720, max: 3010, state: "below", days: [] },
      protein: { average: 230, min: 144, max: 192, state: "over" },
      weighIn: { kg: 80.9, changeKg: 0.9 },
      readiness: { average: 9 },
    });
    expect(weekSummaryTiles(summary, "lb").slice(2)).toEqual([
      { big: "2,040", label: "kcal a day · under", tone: "warning" },
      { big: "230 g", label: "protein a day · over", tone: "danger" },
      { big: "+2 lb", label: "since last Weigh-in", tone: "text" },
      { big: "9", label: "Readiness", tone: "text" },
    ]);
  });

  it("says Readiness went down, or held", () => {
    const tiles = (readiness: WeekSummary["readiness"]) => weekSummaryTiles(week({ readiness }), "kg").at(-1)?.label;
    expect(tiles({ average: 9.5, previous: 11 })).toBe("Readiness · ↓ 1.5");
    expect(tiles({ average: 11, previous: 11 })).toBe("Readiness · same as the week before");
  });
});

// Story 50 and 54
describe("budgetPart", () => {
  it("lists the Muscles short of their Weekly Budget with their Sets against it", () => {
    const summary = week({
      weeklyBudget: {
        met: 7,
        muscles: 9,
        short: [
          { muscle: "side_delts", sets: 6, budget: 9 },
          { muscle: "calves", sets: 0, budget: 5 },
        ],
      },
    });
    expect(budgetPart(summary)).toEqual({
      title: "Weekly Budget · 7 of 9 met",
      short: ["Side delts 6/9", "Calves 0/5"],
    });
  });

  it("reads lighter on purpose on a deload week", () => {
    const summary = week({ deload: true, weeklyBudget: { met: 2, muscles: 9, short: [] } });
    expect(budgetPart(summary)).toEqual({ title: "Deload: lighter on purpose", short: [] });
  });

  it("is left out with no Workouts", () => {
    expect(budgetPart(week())).toBeNull();
  });
});

// Stories 51 and 52
describe("progressRows", () => {
  it("lists the PRs, then the Working Levels that moved, in the user's unit", () => {
    const summary = week({
      prs: [{ slug: "goblet-squat", measure: "reps", best: 14, previous: 12 }],
      moves: [
        { slug: "one-arm-dumbbell-row", direction: "up", change: "target-up", level: { unit: "kg", kg: 20, reps: 10 } },
        {
          slug: "dumbbell-lateral-raise",
          direction: "down",
          change: "load-down",
          level: { unit: "kg", kg: 6.80388555, reps: 12 },
        },
      ],
    });
    expect(progressRows(summary, "lb")).toEqual([
      { kind: "pr", left: "⭐ PR · Goblet squat", right: "14 reps, up from 12", tone: "text" },
      { kind: "move", left: "One-arm dumbbell row", right: "↑ 44 lb × 10", tone: "success" },
      { kind: "move", left: "Lateral raise", right: "↓ back to 15 lb × 12, missed twice", tone: "warning" },
    ]);
  });

  it("is empty with neither", () => {
    expect(progressRows(week(), "kg")).toEqual([]);
  });
});

// Story 53: a bar for each day of the week, coloured by its range state; a day with no food logged has none
describe("dayBars", () => {
  it("gives every day of the week, the logged ones a height against the week's highest", () => {
    const summary = week({
      kcal: {
        average: 2500,
        min: 2720,
        max: 3010,
        state: "below",
        days: [
          { date: "2026-11-23", kcal: 1500, state: "below" },
          { date: "2026-11-25", kcal: 3000, state: "in" },
          { date: "2026-11-29", kcal: 3300, state: "over" },
        ],
      },
    });
    const bars = dayBars(summary);
    expect(bars.map(({ day, kcal, tone }) => [day, kcal, tone])).toEqual([
      ["M", 1500, "accent"],
      ["T", null, null],
      ["W", 3000, "success"],
      ["T", null, null],
      ["F", null, null],
      ["S", null, null],
      ["S", 3300, "danger"],
    ]);
    expect(bars[0].fill).toBeCloseTo(1500 / 3300);
    expect(bars[6].fill).toBe(1);
  });

  it("is empty with no food logged", () => {
    expect(dayBars(week())).toEqual([]);
  });
});
