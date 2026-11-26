import type { WeekSummary } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { lastWeekLink, weekSummaryBars, weekSummaryToAsk } from "./week-summary-card";

const week = (parts: Partial<WeekSummary> = {}): WeekSummary => ({
  monday: "2026-11-23",
  sunday: "2026-11-29",
  seen: false,
  partWeek: false,
  workouts: { done: 3, planned: 3 },
  streak: 4,
  coach: { sentence: "A full week.", line: "Every Workout done." },
  ...parts,
});

// Spec #206 story 45, prototype variant C: bars for Workouts, kcal, protein and the Weekly Budget met
describe("weekSummaryBars", () => {
  it("shows a bar for each part, worded as the card reads", () => {
    expect(
      weekSummaryBars(
        week({
          kcal: { average: 2870, min: 2720, max: 3010, state: "in", days: [] },
          protein: { average: 171, min: 144, max: 192, state: "in" },
          weeklyBudget: { met: 7, muscles: 9, short: [] },
        }),
      ),
    ).toEqual([
      { label: "Workouts", value: "3 of 3", fill: 1, tone: "success" },
      { label: "Calories", value: "2,870 avg · in range", fill: 1, tone: "success" },
      { label: "Protein", value: "171 g avg · in range", fill: 1, tone: "success" },
      { label: "Weekly Budget", value: "7 of 9 Muscles met", fill: 7 / 9, tone: "accent" },
    ]);
  });

  it("fills a short week's bars part way, and says when food was under or over its range", () => {
    expect(
      weekSummaryBars(
        week({
          workouts: { done: 1, planned: 3 },
          kcal: { average: 2040, min: 2720, max: 3010, state: "below", days: [] },
          protein: { average: 230, min: 144, max: 192, state: "over" },
          weeklyBudget: { met: 0, muscles: 9, short: [] },
        }),
      ),
    ).toEqual([
      { label: "Workouts", value: "1 of 3", fill: 1 / 3, tone: "accent" },
      { label: "Calories", value: "2,040 avg · under", fill: 0.75, tone: "warning" },
      { label: "Protein", value: "230 g avg · over", fill: 1, tone: "danger" },
      { label: "Weekly Budget", value: "0 of 9 Muscles met", fill: 0, tone: "accent" },
    ]);
  });

  // Story 55: a part with no data is left out, not shown as zero
  it("leaves out the parts the week has no data for", () => {
    expect(weekSummaryBars(week({ workouts: { done: 0, planned: 2 } }))).toEqual([
      { label: "Workouts", value: "0 of 2", fill: 0, tone: "accent" },
    ]);
  });

  // Story 54: a light week isn't read as a bad one
  it("reads the Weekly Budget as lighter on purpose on a deload week", () => {
    const bars = weekSummaryBars(week({ deload: true, weeklyBudget: { met: 2, muscles: 9, short: [] } }));
    expect(bars.at(-1)).toEqual({
      label: "Weekly Budget",
      value: "Deload: lighter on purpose",
      fill: 1,
      tone: "success",
    });
  });
});

// Stories 35 and 38: Today asks for the week just ended from 6 pm on Sunday, and later in the week while it isn't
// known to be seen. Onboarded on Wednesday 18 November 2026; Denver is UTC−7
describe("weekSummaryToAsk", () => {
  const asks = (iso: string, seenMonday: string | null = null) =>
    weekSummaryToAsk({
      now: new Date(iso),
      timeZone: "America/Denver",
      onboardedAt: "2026-11-18T19:00:00Z",
      seenMonday,
    });

  it("asks for the week ending from 6 pm on its Sunday, in the user's timezone", () => {
    expect(asks("2026-11-23T00:59:00Z")).toBeNull();
    expect(asks("2026-11-23T01:00:00Z")).toBe("2026-11-16");
  });

  it("asks later in the week while it isn't known to be seen, and not once it is", () => {
    expect(asks("2026-11-25T16:00:00Z")).toBe("2026-11-16");
    expect(asks("2026-11-25T16:00:00Z", "2026-11-16")).toBeNull();
    // The next week's is due on its own Sunday
    expect(asks("2026-11-30T01:00:00Z", "2026-11-16")).toBe("2026-11-23");
  });

  it("doesn't ask for a week before the user onboarded", () => {
    expect(asks("2026-11-20T16:00:00Z")).toBeNull();
  });
});

// Story 41: "Last week" in This week brings back the latest Week Summary until the next one is due, at 6 pm on Sunday,
// when it moves on to that one, so the week just ended stays a tap away once its card has gone. Onboarded on Wednesday
// 18 November 2026; Denver is UTC−7
describe("lastWeekLink", () => {
  const link = (iso: string) =>
    lastWeekLink({ now: new Date(iso), timeZone: "America/Denver", onboardedAt: "2026-11-18T19:00:00Z" });

  it("opens the week before, from Monday until 6 pm on Sunday in the user's timezone", () => {
    expect(link("2026-11-30T08:00:00Z")).toBe("2026-11-23");
    expect(link("2026-12-07T00:59:00Z")).toBe("2026-11-23");
  });

  it("moves on to the week ending once its Week Summary is due, and stays on it through the next week", () => {
    expect(link("2026-12-07T01:00:00Z")).toBe("2026-11-30");
    expect(link("2026-12-07T08:00:00Z")).toBe("2026-11-30");
  });

  it("opens the part first week from 6 pm on its Sunday", () => {
    expect(link("2026-11-23T01:00:00Z")).toBe("2026-11-16");
  });

  it("opens the part first week", () => {
    expect(link("2026-11-25T16:00:00Z")).toBe("2026-11-16");
  });

  it("isn't there in the week the user onboarded, before its Week Summary is due", () => {
    expect(link("2026-11-20T16:00:00Z")).toBeNull();
    expect(link("2026-11-23T00:59:00Z")).toBeNull();
  });
});
