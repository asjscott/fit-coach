import { describe, expect, it } from "vitest";
import { weeklyBudget } from "./weekly-budget";

describe("weeklyBudget", () => {
  it("is the build_muscle row at 4 days per week", () => {
    expect(weeklyBudget()).toEqual({
      quads: 16,
      hamstrings: 16,
      glutes: 16,
      chest: 16,
      lats: 16,
      upper_back: 16,
      side_delts: 10,
      abs: 10,
    });
  });
});
