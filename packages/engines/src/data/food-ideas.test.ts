import { FoodIdea } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { FOOD_IDEAS } from "./food-ideas";

// Checks the Food Ideas' data rather than the code that chooses from it

describe("Food Ideas", () => {
  it("are about 40 foods, each with a unique id", () => {
    expect(FOOD_IDEAS.length).toBeGreaterThanOrEqual(35);
    const ids = FOOD_IDEAS.map((idea) => idea.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  // Spec #158 "Diet and Food Ideas": a kind, nutrients and a portion for every idea
  it("each have a kind, nutrients and a portion", () => {
    expect(FOOD_IDEAS.filter((idea) => !FoodIdea.safeParse(idea).success).map((idea) => idea.id)).toEqual([]);
    expect(
      FOOD_IDEAS.filter((idea) => idea.nutrients.kcal <= 0 || idea.nutrients.proteinG <= 0).map((idea) => idea.id),
    ).toEqual([]);
  });

  // The kcal on a label follow from its protein, carbs and fat (4, 4 and 9 kcal a gram), give or take rounding and
  // fibre, so a figure typed wrong shows up here
  it("have kcal that agree with their protein, carbs and fat", () => {
    const off = FOOD_IDEAS.filter(({ nutrients: n }) => {
      const fromMacros = 4 * n.proteinG + 4 * n.carbsG + 9 * n.fatG;
      return Math.abs(fromMacros - n.kcal) > Math.max(25, 0.15 * n.kcal);
    }).map((idea) => idea.id);
    expect(off).toEqual([]);
  });

  it("never have a vegan idea that contains dairy", () => {
    expect(FOOD_IDEAS.filter((i) => i.kind === "vegan" && i.contains.includes("dairy")).map((i) => i.id)).toEqual([]);
  });

  it("never have a vegetarian or vegan idea that contains pork", () => {
    expect(
      FOOD_IDEAS.filter((i) => (i.kind === "vegan" || i.kind === "vegetarian") && i.contains.includes("pork")).map(
        (i) => i.id,
      ),
    ).toEqual([]);
  });

  // The Coach's summary lower-cases the first letter of the second idea it names ("Cottage cheese and tofu")
  it("have names that read in the middle of a sentence once their first letter is lower-cased", () => {
    expect(FOOD_IDEAS.filter((i) => /^[A-Z][a-z]*[A-Z]|^(Greek|Icelandic)/.test(i.name)).map((i) => i.id)).toEqual([]);
  });

  it("offer every kind of Diet something", () => {
    for (const kind of ["meat", "fish", "vegetarian", "vegan"] as const) {
      expect(FOOD_IDEAS.filter((i) => i.kind === kind).length).toBeGreaterThanOrEqual(6);
    }
  });
});
