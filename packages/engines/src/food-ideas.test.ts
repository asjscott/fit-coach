import type { AvoidedFood, Diet, FoodIdea, FoodIdeaKind } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { FOOD_IDEAS } from "./data/food-ideas";
import { foodIdeas, ideaFood, mealForTimeOfDay } from "./food-ideas";

const idea = (id: string, kind: FoodIdeaKind, kcal: number, proteinG: number, contains: AvoidedFood[] = []) =>
  ({
    id,
    name: id,
    portion: { label: "1 portion", grams: 100 },
    nutrients: { kcal, proteinG, carbsG: 0, fatG: 0, fibreG: 0 },
    kind,
    contains,
  }) satisfies FoodIdea;

// Protein per kcal, by hand: chicken 0.2, tuna 0.25, cottage 0.18, tofu 0.12, lentils 0.08, ham 0.16, seitan 0.21,
// yogurt 0.17, peanuts 0.04
const LIST = [
  idea("chicken", "meat", 250, 50),
  idea("ham", "meat", 100, 16, ["pork"]),
  idea("tuna", "fish", 140, 35),
  idea("cottage", "vegetarian", 160, 28.8, ["dairy"]),
  idea("yogurt", "vegetarian", 120, 20.4, ["dairy"]),
  idea("tofu", "vegan", 200, 24),
  idea("seitan", "vegan", 120, 25.2, ["gluten"]),
  idea("lentils", "vegan", 230, 18.4),
  idea("peanuts", "vegan", 190, 7.6, ["nuts"]),
];

// Ranges of 1,900 to 2,100 kcal and 144 to 192 g of protein
const TARGETS = { kcal: 2000, proteinG: 160 };
const ids = (diet: Diet, eaten: { kcal?: number; proteinG?: number } = {}) =>
  foodIdeas(diet, TARGETS, { kcal: 0, proteinG: 0, ...eaten }, LIST).map((i) => i.id);

describe("foodIdeas", () => {
  // Spec #158 story 34 and "Diet and Food Ideas" steps 1 and 4: the Diet's kinds, most protein per kcal first
  it.each([
    ["any", ["tuna", "seitan"]],
    ["pescatarian", ["tuna", "seitan"]],
    ["vegetarian", ["seitan", "cottage"]],
    ["vegan", ["seitan", "tofu"]],
  ] as const)("keeps the kinds a %s Diet allows, the two with the most protein per kcal", (kind, expected) => {
    expect(ids({ kind, avoid: [] })).toEqual(expected);
  });

  it("never offers meat to a pescatarian, or fish to a vegetarian", () => {
    expect(ids({ kind: "pescatarian", avoid: ["gluten"] })).toEqual(["tuna", "cottage"]);
    expect(ids({ kind: "vegetarian", avoid: ["gluten", "dairy"] })).toEqual(["tofu", "lentils"]);
  });

  // Story 7: an idea that contains a food the user avoids is never offered
  it.each([
    [["gluten"], "vegan", ["tofu", "lentils"]],
    [["dairy"], "vegetarian", ["seitan", "tofu"]],
    [["pork"], "any", ["tuna", "seitan"]],
    [["gluten", "dairy"], "any", ["tuna", "chicken"]],
  ] as const)("drops ideas containing %j for a %s Diet", (avoid, kind, expected) => {
    expect(ids({ kind, avoid: [...avoid] })).toEqual(expected);
  });

  it("offers nuts only to a user who doesn't avoid them", () => {
    // With seitan ruled out, peanuts (190 kcal) are the only vegan idea that fits in 199 kcal
    expect(ids({ kind: "vegan", avoid: ["gluten"] }, { kcal: 1901 })).toEqual(["peanuts"]);
    expect(ids({ kind: "vegan", avoid: ["gluten", "nuts"] }, { kcal: 1901 })).toEqual([]);
  });

  // Spec #188 story 12: up to the top of the kcal range (2,100) and never past it, even with both added
  it.each([
    [1840, ["tuna", "seitan"]],
    [1841, ["tuna", "ham"]],
    [1960, ["tuna"]],
    [1961, ["seitan"]],
    [2000, ["ham"]],
    [2000.4, ["ham"]],
    [2000.5, []],
    [2100, []],
    [2500, []],
  ] as const)("with %d kcal eaten, offers only ideas that fit: %j", (kcal, expected) => {
    expect(ids({ kind: "any", avoid: [] }, { kcal })).toEqual(expected);
  });

  // Spec #188 story 11: protein is met from the bottom of its range (144 g)
  it.each([143.5, 144, 160, 250])("offers none with %d g of protein eaten", (proteinG) => {
    expect(ids({ kind: "any", avoid: [] }, { proteinG })).toEqual([]);
  });

  it("offers ideas while protein is below its range", () => {
    expect(ids({ kind: "any", avoid: [] }, { proteinG: 143.4 })).toHaveLength(2);
  });

  it("chooses from the Coach's own list by default", () => {
    const chosen = foodIdeas({ kind: "vegan", avoid: [] }, TARGETS, { kcal: 0, proteinG: 0 });

    expect(chosen).toHaveLength(2);
    expect(chosen.every((i) => FOOD_IDEAS.includes(i) && i.kind === "vegan")).toBe(true);
  });
});

describe("ideaFood", () => {
  // Spec #158: adding an idea logs a Food Entry with source idea, through the one food shape
  it("is the idea as a food with its portion as the one serving, per 100 g", () => {
    const tofu = {
      id: "tofu",
      name: "Tofu",
      portion: { label: "½ block", grams: 150 },
      nutrients: { kcal: 216, proteinG: 26, carbsG: 4.2, fatG: 13, fibreG: 3.5 },
      kind: "vegan",
      contains: [],
    } satisfies FoodIdea;

    const food = ideaFood(tofu);

    expect(food).toMatchObject({
      source: "idea",
      id: "tofu",
      name: "Tofu",
      servings: [{ label: "½ block", grams: 150 }],
    });
    // 216 ÷ 1.5 = 144 kcal, 26 ÷ 1.5 ≈ 17.33 g protein per 100 g
    expect(food.per100g.kcal).toBeCloseTo(144);
    expect(food.per100g.proteinG).toBeCloseTo(17.333);
    expect(food.per100g.fibreG).toBeCloseTo(2.333);
  });
});

describe("mealForTimeOfDay", () => {
  // Spec #158 "Diet and Food Ideas": Breakfast before 11:00, Lunch before 16:00, Dinner before 21:00, then Snacks
  it.each([
    ["00:00", "breakfast"],
    ["10:59", "breakfast"],
    ["11:00", "lunch"],
    ["15:59", "lunch"],
    ["16:00", "dinner"],
    ["20:59", "dinner"],
    ["21:00", "snacks"],
    ["23:59", "snacks"],
  ] as const)("at %s is %s", (time, meal) => {
    expect(mealForTimeOfDay(new Date(`2026-11-18T${time}:00Z`), "UTC")).toBe(meal);
  });

  // 18:30 UTC is 13:30 in New York, 10:30 in Los Angeles and 07:30 the next morning in Auckland (UTC+13 in November)
  it("goes by the time in the user's timezone", () => {
    const now = new Date("2026-11-18T18:30:00Z");

    expect(mealForTimeOfDay(now, "UTC")).toBe("dinner");
    expect(mealForTimeOfDay(now, "America/New_York")).toBe("lunch");
    expect(mealForTimeOfDay(now, "America/Los_Angeles")).toBe("breakfast");
    expect(mealForTimeOfDay(now, "Pacific/Auckland")).toBe("breakfast");
  });
});
