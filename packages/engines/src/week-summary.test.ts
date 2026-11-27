import type { NutritionWeek } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { latestWeekSummaryMonday, weekSummary, type WeekSummaryInput } from "./week-summary";

// Denver is UTC−7 in November 2026, while the tests run on Los Angeles time: the user's timeZone decides
const timeZone = "America/Denver";

describe("latestWeekSummaryMonday", () => {
  it("is the week before until 6 pm on Sunday in the user's timezone, then the week ending", () => {
    // Sunday 29 November at 5:59 pm and 6 pm in Denver
    expect(latestWeekSummaryMonday(new Date("2026-11-30T00:59:00Z"), timeZone)).toBe("2026-11-16");
    expect(latestWeekSummaryMonday(new Date("2026-11-30T01:00:00Z"), timeZone)).toBe("2026-11-23");
    // Monday 30 November just after midnight
    expect(latestWeekSummaryMonday(new Date("2026-11-30T07:30:00Z"), timeZone)).toBe("2026-11-23");
  });
});

const days = (logged: Record<string, [number, number, number]> = {}): NutritionWeek["days"] =>
  ["23", "24", "25", "26", "27", "28", "29"].map((day) => {
    const date = `2026-11-${day}`;
    const [kcal, proteinG, targetKcal] = logged[date] ?? [0, 0, 2700];
    return { date, totals: { kcal, proteinG }, targets: { kcal: targetKcal, proteinG: 160 }, logged: !!logged[date] };
  });

const input = (parts: Partial<WeekSummaryInput> = {}): WeekSummaryInput => ({
  monday: "2026-11-23",
  onboardedAt: new Date("2026-10-01T12:00:00Z"),
  timeZone,
  daysPerWeek: 3,
  goal: "build_muscle",
  unit: "kg",
  workouts: [],
  food: { today: "2026-11-30", firstLoggedDate: null, days: days() },
  latestAssessment: null,
  weighIn: null,
  checkIns: [],
  checkInsBefore: [],
  ...parts,
});

describe("weekSummary, the part first week", () => {
  // Spec #206 story 42: Wednesday 25 November at 10 pm in Denver, already Thursday in UTC, leaves 5 days of 7
  it("pro-rates the Workouts planned from the day the user onboarded in their timezone", () => {
    const summary = weekSummary(input({ onboardedAt: new Date("2026-11-26T05:00:00Z") }));
    expect(summary).toMatchObject({ partWeek: true, workouts: { done: 0, planned: 2 } });
  });

  it("plans at least one Workout when the user onboarded on the Sunday", () => {
    const summary = weekSummary(input({ onboardedAt: new Date("2026-11-29T18:00:00Z") }));
    expect(summary).toMatchObject({ partWeek: true, workouts: { done: 0, planned: 1 } });
  });

  // 11 pm on Monday 23 November in Denver, already Tuesday in UTC
  it("is a whole week when the user onboarded on its Monday in their timezone", () => {
    const summary = weekSummary(input({ onboardedAt: new Date("2026-11-24T06:00:00Z") }));
    expect(summary).toMatchObject({ partWeek: false, workouts: { done: 0, planned: 3 } });
  });
});

describe("weekSummary, the food averages", () => {
  // Targets of 2,600 and 2,800 kcal average 2,700, whose range is 2,570 to 2,840
  it("reads the daily average against the range of the logged days' average target", () => {
    const food = {
      today: "2026-11-30",
      firstLoggedDate: "2026-11-24",
      days: days({ "2026-11-24": [2500, 150, 2600], "2026-11-26": [2700, 170, 2800] }),
    };
    expect(weekSummary(input({ food })).kcal).toEqual({
      average: 2600,
      min: 2570,
      max: 2840,
      state: "in",
      days: [
        { date: "2026-11-24", kcal: 2500, state: "in" },
        { date: "2026-11-26", kcal: 2700, state: "in" },
      ],
    });
  });
});
