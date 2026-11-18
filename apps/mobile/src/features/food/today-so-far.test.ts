import type { FoodEntry } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { portionChoice } from "./food-portion";
import { dateBefore, dayStepLabel, entryPortion, mealLine, mealName } from "./today-so-far";

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

describe("dateBefore", () => {
  it("counts back calendar days, across a month and a year", () => {
    expect(dateBefore("2026-11-18", 0)).toBe("2026-11-18");
    expect(dateBefore("2026-11-18", 6)).toBe("2026-11-12");
    expect(dateBefore("2026-03-02", 2)).toBe("2026-02-28");
    expect(dateBefore("2027-01-01", 1)).toBe("2026-12-31");
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
});

describe("portionChoice", () => {
  it("sends grams, or the serving's label and how many", () => {
    expect(portionChoice({ unit: "g" }, "80")).toEqual({ grams: 80 });
    expect(portionChoice({ unit: "serving", serving: { label: "1 slice", grams: 40 } }, "1,5")).toEqual({
      serving: "1 slice",
      count: 1.5,
    });
  });

  it("has nothing to send until the amount is a number above 0", () => {
    expect(portionChoice({ unit: "g" }, "")).toBeNull();
    expect(portionChoice({ unit: "serving", serving: { label: "1 slice", grams: 40 } }, "0")).toBeNull();
  });
});
