import type { FoodEntry } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { amountOf, portionChoice } from "./food-portion";
import { dayStepLabel, entryPortion, mealLine, mealName } from "./today-so-far";

const entry = (kcal: number, portion: FoodEntry["portion"] = { grams: 100 }): FoodEntry => ({
  id: "e1",
  date: "2026-11-18",
  meal: "breakfast",
  loggedAt: "2026-11-18T08:00:00.000Z",
  food: {
    source: "usda",
    id: "1",
    name: "Egg",
    per100g: { kcal: 140, proteinG: 12, carbsG: 1, fatG: 10, fibreG: 0 },
    servings: [],
  },
  portion,
  nutrients: { kcal, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 },
});

describe("dayStepLabel", () => {
  // Spec #158 story 44: today and the 6 days before it
  it("names today, yesterday, and the days before by how long ago they were", () => {
    expect(dayStepLabel(0)).toBe("Today");
    expect(dayStepLabel(1)).toBe("Yesterday");
    expect(dayStepLabel(6)).toBe("6 days ago");
  });
});

describe("mealName", () => {
  it("capitalises a meal", () => {
    expect(mealName("breakfast")).toBe("Breakfast");
    expect(mealName("snacks")).toBe("Snacks");
  });
});

describe("mealLine", () => {
  // Story 49: each meal shows its number of foods and kcal
  it("counts a meal's foods and adds up their kcal", () => {
    expect(mealLine([entry(140.4), entry(200.3)])).toBe("2 foods · 341 kcal");
    expect(mealLine([entry(1234)])).toBe("1 food · 1,234 kcal");
  });

  it("says when nothing is logged", () => {
    expect(mealLine([])).toBe("Nothing yet");
  });
});

describe("entryPortion", () => {
  // Story 50: each entry's portion, as it was chosen
  it("says a portion in grams, or as a count of the food's serving", () => {
    expect(entryPortion({ grams: 80 })).toBe("80 g");
    expect(entryPortion({ grams: 37.5 })).toBe("37.5 g");
    expect(entryPortion({ grams: 50, serving: { label: "1 large", count: 1 } })).toBe("1 large");
    expect(entryPortion({ grams: 100, serving: { label: "1 large", count: 2 } })).toBe("2 × 1 large");
    expect(entryPortion({ grams: 60, serving: { label: "1 slice", count: 1.5 } })).toBe("1.5 × 1 slice");
  });

  // An ingredient's share of a portion of a Saved Meal
  it("keeps a small portion's amount, never 0", () => {
    const cloves = (count: number) => entryPortion({ grams: 5 * count, serving: { label: "1 clove", count } });
    expect(cloves(0.25)).toBe("0.25 × 1 clove");
    expect(cloves(2 / 3)).toBe("0.67 × 1 clove");
    expect(cloves(0.04)).toBe("0.04 × 1 clove");
    expect(cloves(0.0012)).toBe("0.0012 × 1 clove");
    expect(entryPortion({ grams: 0.25 })).toBe("0.25 g");
    expect(entryPortion({ grams: 0.004 })).toBe("0.004 g");
    expect(entryPortion({ grams: 133.333 })).toBe("133.3 g");
  });
});

describe("portionChoice", () => {
  it("sends grams, or the serving's label and how many", () => {
    expect(portionChoice({ unit: "g" }, amountOf("80"))).toEqual({ grams: 80 });
    expect(portionChoice({ unit: "serving", serving: { label: "1 slice", grams: 40 } }, amountOf("1,5"))).toEqual({
      serving: "1 slice",
      count: 1.5,
    });
  });

  it("has nothing to send until the amount is a number above 0", () => {
    expect(portionChoice({ unit: "g" }, amountOf(""))).toBeNull();
    expect(portionChoice({ unit: "serving", serving: { label: "1 slice", grams: 40 } }, amountOf("0"))).toBeNull();
  });
});
