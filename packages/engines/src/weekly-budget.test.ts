import type { Goal } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { fillOrder, scaledBudget, weeklyBudget } from "./weekly-budget";

const row = (main: number, last: number) => ({
  quads: main,
  hamstrings: main,
  glutes: main,
  chest: main,
  lats: main,
  upper_back: main,
  side_delts: last,
  abs: last,
});

describe("weeklyBudget", () => {
  // Target × the days scale from the spec, by hand: 16 × 0.75, 0.875, 1, 1.125, 1.25 and so on, halves up
  const worked: [Goal, number, number, number][] = [
    ["build_muscle", 2, 12, 8],
    ["build_muscle", 3, 14, 9],
    ["build_muscle", 4, 16, 10],
    ["build_muscle", 5, 18, 11],
    ["build_muscle", 6, 20, 13],
    ["athletic", 2, 12, 8],
    ["athletic", 3, 14, 9],
    ["athletic", 4, 16, 10],
    ["athletic", 5, 18, 11],
    ["athletic", 6, 20, 13],
    ["lose_fat", 2, 11, 6],
    ["lose_fat", 3, 12, 7],
    ["lose_fat", 4, 14, 8],
    ["lose_fat", 5, 16, 9],
    ["lose_fat", 6, 18, 10],
    ["recomp", 2, 11, 6],
    ["recomp", 3, 12, 7],
    ["recomp", 4, 14, 8],
    ["recomp", 5, 16, 9],
    ["recomp", 6, 18, 10],
  ];

  it.each(worked)("%s at %i days per week is %i, and %i for side_delts and abs", (goal, days, main, last) => {
    expect(weeklyBudget(goal, days)).toMatchObject(row(main, last));
  });

  // Story 12: a calf raise exists, so calves join the budget for the two Goals the research found a case for. Min 4,
  // target 6, scaled by the same days scale: 6 × 0.75 = 4.5 rounds up to 5, 6 × 1.125 = 6.75 to 7, 6 × 1.25 = 7.5 to 8
  it.each([
    ["build_muscle", 2, 5],
    ["build_muscle", 3, 5],
    ["build_muscle", 4, 6],
    ["build_muscle", 5, 7],
    ["build_muscle", 6, 8],
    ["athletic", 2, 5],
    ["athletic", 4, 6],
    ["athletic", 6, 8],
  ] as const)("budgets calves for %s at %i days per week at %i", (goal, days, calves) => {
    expect(weeklyBudget(goal, days).calves).toBe(calves);
  });

  it.each(["lose_fat", "recomp"] as const)("leaves calves out of %s's budget", (goal) => {
    expect(Object.keys(weeklyBudget(goal, 4))).not.toContain("calves");
    expect(weeklyBudget(goal, 4)).toEqual(row(14, 8));
  });
});

describe("scaledBudget", () => {
  it("can't fall below the min", () => {
    expect(scaledBudget({ min: 10, target: 12 }, 2)).toBe(10);
  });

  it("rounds a half up", () => {
    // 10 × 1.25 and 14 × 0.75
    expect(scaledBudget({ min: 6, target: 10 }, 6)).toBe(13);
    expect(scaledBudget({ min: 10, target: 14 }, 2)).toBe(11);
  });
});

describe("fillOrder", () => {
  // Story 12: calves fill with side_delts and abs, the last Muscles
  it("takes every Muscle to 4, then to its min, then the bigger Muscles to budget, then side_delts, abs and calves", () => {
    const { side_delts, abs, ...main } = row(14, 9);
    expect(fillOrder("build_muscle", 3)).toEqual([
      { ...row(4, 4), calves: 4 },
      { ...row(10, 6), calves: 4 },
      main,
      { side_delts, abs, calves: 5 },
    ]);
  });

  it("uses the Goal's mins", () => {
    expect(fillOrder("recomp", 4)[1]).toEqual(row(10, 4));
  });
});
