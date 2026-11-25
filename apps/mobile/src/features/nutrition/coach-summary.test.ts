import type { Day, FoodIdea, Meal } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { coachSummary, ideaLine } from "./coach-summary";

const idea = (name: string, proteinG: number): FoodIdea => ({
  id: name.toLowerCase().replace(/ /g, "-"),
  name,
  portion: { label: "1 cup", grams: 200 },
  nutrients: { kcal: 160, proteinG, carbsG: 6, fatG: 2, fibreG: 0 },
  kind: "vegetarian",
  contains: [],
});

const cottageCheese = idea("Cottage cheese", 28);
const tofu = idea("Tofu", 26);

// Targets of 2,650 kcal (2,520 to 2,780), 160 g protein (144 to 192), 106 g fibre and 2.75 L of water, with what's
// eaten so far
const day = (eaten: Partial<Day["totals"]>, ideas: FoodIdea[] = [], ideaMeal: Meal = "dinner", waterMl = 0): Day => ({
  date: "2026-11-18",
  targets: { kcal: 2650, proteinG: 160, fatG: 64, carbsG: 359, fibreG: 106, waterMl: 2750 },
  totals: { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fibreG: 0, ...eaten },
  meals: [],
  waterMl,
  ideas,
  ideaMeal,
});

describe("ideaLine", () => {
  // Story 57: each Food Idea shows its portion, kcal and protein
  it("shows the portion, kcal and protein, rounded", () => {
    expect(
      ideaLine({
        ...tofu,
        portion: { label: "½ block", grams: 150 },
        nutrients: { ...tofu.nutrients, kcal: 1216, proteinG: 26.4 },
      }),
    ).toBe("½ block · 1,216 kcal · 26 g protein");
  });
});

describe("coachSummary", () => {
  // Spec #158 story 33 and 34, with the spec's own example
  it("says what's left, and which Food Ideas at which meal would cover the protein", () => {
    expect(coachSummary(day({ kcal: 1614, proteinG: 106 }, [cottageCheese, tofu]))).toEqual({
      headline: "906–1,166 kcal and 38–86 g of protein left to be in range.",
      line: "Cottage cheese and tofu at dinner would cover all of the protein.",
    });
  });

  it("says how much of the protein the ideas cover when it isn't all of it", () => {
    expect(coachSummary(day({ kcal: 1000, proteinG: 60 }, [cottageCheese, tofu])).line).toBe(
      "Cottage cheese and tofu at dinner would cover 54 g of the protein.",
    );
  });

  it("names one idea on its own", () => {
    expect(coachSummary(day({ kcal: 2400, proteinG: 140 }, [tofu])).line).toBe(
      "Tofu at dinner would cover all of the protein.",
    );
  });

  it.each([
    ["breakfast", "Tofu at breakfast would"],
    ["lunch", "Tofu at lunch would"],
    ["snacks", "Tofu as a snack would"],
  ] as const)("names the meal for the time of day: %s", (meal, start) => {
    expect(coachSummary(day({}, [tofu], meal)).line).toMatch(new RegExp(`^${start}`));
  });

  it("says when no Food Idea fits", () => {
    expect(coachSummary(day({ kcal: 2500, proteinG: 100 }))).toEqual({
      headline: "20–280 kcal and 44–92 g of protein left to be in range.",
      line: "None of the Food Ideas fits under the top of the kcal range.",
    });
  });

  // Spec #188 story 10, with its own example: 1,500 kcal is a range of 1,430 to 1,580
  it("speaks of the range that's left", () => {
    const d = day({ kcal: 1270, proteinG: 150 });
    expect(coachSummary({ ...d, targets: { ...d.targets, kcal: 1500 } }).headline).toBe(
      "Protein in range, with 160–310 kcal left to be in range.",
    );
  });

  // In range or over, said plainly, from the same edges as the rings
  it.each([
    [{ kcal: 2520, proteinG: 144 }, "Calories and protein in range."],
    [{ kcal: 2780, proteinG: 192 }, "Calories and protein in range."],
    [{ kcal: 2519.5, proteinG: 192.4 }, "Calories and protein in range."],
    [{ kcal: 3030, proteinG: 160 }, "250 kcal over, protein in range."],
    [{ kcal: 2650, proteinG: 202 }, "Calories in range, 10 g of protein over."],
    [{ kcal: 3030, proteinG: 202 }, "250 kcal over, 10 g of protein over."],
    [{ kcal: 3030, proteinG: 120 }, "250 kcal over, with 24–72 g of protein left to be in range."],
    [{ kcal: 2000, proteinG: 202 }, "10 g of protein over, with 520–780 kcal left to be in range."],
  ])("with %j eaten, says %s", (eaten, headline) => {
    expect(coachSummary(day(eaten))).toEqual({ headline, line: null });
  });

  it("still offers Food Ideas with the calories in range and protein below", () => {
    expect(coachSummary(day({ kcal: 2520, proteinG: 120 }, [tofu]))).toEqual({
      headline: "Calories in range, with 24–72 g of protein left to be in range.",
      line: "Tofu at dinner would cover all of the protein.",
    });
  });

  // Story 35: fibre and water stay goals, never a shortfall
  it.each([
    ["nothing eaten", day({}, [tofu])],
    ["some eaten", day({ kcal: 1614, proteinG: 106 }, [cottageCheese, tofu])],
    ["no idea fits", day({ kcal: 2600, proteinG: 100 })],
    ["kcal over", day({ kcal: 2900, proteinG: 120 })],
    ["protein in range", day({ kcal: 2000, proteinG: 170 })],
    ["all in range", day({ kcal: 2650, proteinG: 160 })],
  ])("never names fibre or water with %s, however short of them the day is", (_, d) => {
    const { headline, line } = coachSummary(d);
    expect(`${headline} ${line ?? ""}`).not.toMatch(/fibre|fiber|water|litre|\bml\b/i);
  });
});
