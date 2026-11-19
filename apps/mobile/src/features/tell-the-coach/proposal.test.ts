import type { Food } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { portionAt, proposalPortionLine, proposalSlider, proposalWhen } from "./proposal";

const egg: Food = {
  source: "coach",
  id: "egg-boiled",
  name: "Egg, boiled",
  per100g: { kcal: 155, proteinG: 12.6, carbsG: 1.1, fatG: 10.6, fibreG: 0 },
  servings: [{ label: "1 large egg", grams: 50 }],
};

describe("proposalWhen", () => {
  it("names the day and the meal", () => {
    expect(proposalWhen({ date: "2026-11-17", meal: "breakfast" }, "2026-11-18")).toBe("Yesterday · Breakfast");
    expect(proposalWhen({ date: "2026-11-18", meal: "snacks" }, "2026-11-18")).toBe("Today · Snacks");
  });
});

describe("proposalSlider", () => {
  it("slides a counted serving in halves, up to at least 4", () => {
    expect(proposalSlider({ serving: "1 large egg", count: 2 })).toEqual({ min: 0.5, max: 4, step: 0.5, value: 2 });
    expect(proposalSlider({ serving: "1 large egg", count: 6 })).toEqual({ min: 0.5, max: 12, step: 0.5, value: 6 });
  });

  it("slides grams in steps that suit the size, up to twice the portion", () => {
    expect(proposalSlider({ grams: 60 })).toEqual({ min: 5, max: 120, step: 5, value: 60 });
    expect(proposalSlider({ grams: 250 })).toEqual({ min: 10, max: 500, step: 10, value: 250 });
    expect(proposalSlider({ grams: 3 })).toEqual({ min: 5, max: 50, step: 5, value: 5 });
  });

  it("never goes past what a Food Entry takes", () => {
    expect(proposalSlider({ grams: 4000 }).max).toBe(5000);
    expect(proposalSlider({ serving: "1 almond", count: 80 }).max).toBe(100);
  });
});

describe("portionAt", () => {
  it("keeps the serving and changes how many, or changes the grams", () => {
    expect(portionAt({ serving: "1 large egg", count: 2 }, 3)).toEqual({ serving: "1 large egg", count: 3 });
    expect(portionAt({ grams: 60 }, 90)).toEqual({ grams: 90 });
  });
});

describe("proposalPortionLine", () => {
  it("says the portion, its grams and what it holds", () => {
    expect(proposalPortionLine(egg, { serving: "1 large egg", count: 2 })).toBe(
      "2 × 1 large egg · 100 g · 155 kcal · 12.6 g protein · 0 g fibre",
    );
    expect(proposalPortionLine(egg, { serving: "1 large egg", count: 1 })).toBe(
      "1 large egg · 50 g · 78 kcal · 6.3 g protein · 0 g fibre",
    );
    expect(proposalPortionLine(egg, { grams: 60 })).toBe("60 g · 93 kcal · 7.6 g protein · 0 g fibre");
  });
});
