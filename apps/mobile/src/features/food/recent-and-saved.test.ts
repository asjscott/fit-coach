import type { Food } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { copyLabel, recentAndSaved } from "./recent-and-saved";

const food = (source: Food["source"], id: string, name = id): Food => ({
  source,
  id,
  name,
  per100g: { kcal: 100, proteinG: 10, carbsG: 0, fatG: 0, fibreG: 0 },
  servings: [],
});

describe("recentAndSaved", () => {
  // Spec #158 story 62 and prototype variant J: Saved Foods first, then Recent
  it("lists the Saved Foods first, then the Recent foods", () => {
    const bar = food("saved", "s1", "Protein bar");
    const egg = food("usda", "1", "Egg");
    const oats = food("off", "2", "Oats");

    expect(recentAndSaved([bar], [egg, oats])).toEqual([
      { key: "saved:s1", food: bar, saved: true },
      { key: "usda:1", food: egg, saved: false },
      { key: "off:2", food: oats, saved: false },
    ]);
  });

  // A Saved Food edited since it was logged is offered as it is now, and only once
  it("leaves out a Recent food that is one of the Saved Foods", () => {
    const logged = food("saved", "s1", "Protein bar (old label)");
    const now = food("saved", "s1", "Protein bar");
    const egg = food("usda", "1", "Egg");

    expect(recentAndSaved([now], [logged, egg]).map((c) => c.food)).toEqual([now, egg]);
  });

  it("keeps a Recent food whose Saved Food was deleted, as it was logged", () => {
    const gone = food("saved", "s9", "Old bar");

    expect(recentAndSaved([], [gone])).toEqual([{ key: "saved:s9", food: gone, saved: false }]);
  });

  // Nothing is left to edit, so "Edit saved meal" isn't offered (its source alone would)
  it("no longer marks a Recent Saved Meal as saved once it's deleted", () => {
    const gone = food("saved_meal", "m9", "Old chili");

    expect(recentAndSaved([], [gone])).toMatchObject([{ food: gone, saved: false }]);
    expect(recentAndSaved([gone], [gone])).toMatchObject([{ food: gone, saved: true }]);
  });

  it("is empty when nothing is saved or logged", () => {
    expect(recentAndSaved([], [])).toEqual([]);
  });
});

describe("copyLabel", () => {
  // Story 52: "Copy from yesterday" on today's meals; on an earlier day it copies the day before that one
  it("copies from yesterday on today, and from the day before on an earlier day", () => {
    expect(copyLabel(0)).toBe("Copy from yesterday");
    expect(copyLabel(1)).toBe("Copy from the day before");
    expect(copyLabel(6)).toBe("Copy from the day before");
  });
});
