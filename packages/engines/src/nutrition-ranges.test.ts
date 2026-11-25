import { describe, expect, it } from "vitest";
import { nutritionRanges, rangeState } from "./nutrition-ranges";

describe("nutritionRanges", () => {
  // Spec #188 stories 1 and 2, by hand: kcal ±5% to the nearest 10, protein 90–120% to the nearest gram
  it.each([
    // 2,517.5 to 2,782.5 kcal; 144 to 192 g
    [2650, 160, { min: 2520, max: 2780 }, { min: 144, max: 192 }],
    // 2,565 and 2,835 kcal are halfway, so round up; 86.4 to 115.2 g
    [2700, 96, { min: 2570, max: 2840 }, { min: 86, max: 115 }],
    // 1,425 to 1,575 kcal; 112.5 and 150 g
    [1500, 125, { min: 1430, max: 1580 }, { min: 113, max: 150 }],
    [0, 0, { min: 0, max: 0 }, { min: 0, max: 0 }],
  ])("makes %i kcal and %i g of protein ranges", (kcal, proteinG, kcalRange, proteinRange) => {
    expect(nutritionRanges({ kcal, proteinG })).toEqual({ kcal: kcalRange, proteinG: proteinRange });
  });
});

describe("rangeState", () => {
  const range = { min: 2520, max: 2780 };

  // Spec #188: both ends are in range, and amounts are rounded as shown first
  it.each([
    [0, { state: "below", by: 2520 }],
    [2519, { state: "below", by: 1 }],
    [2519.4, { state: "below", by: 1 }],
    [2519.5, { state: "in", by: 0 }],
    [2520, { state: "in", by: 0 }],
    [2780, { state: "in", by: 0 }],
    [2780.4, { state: "in", by: 0 }],
    [2780.5, { state: "over", by: 1 }],
    [3030, { state: "over", by: 250 }],
  ])("reads %d as %j", (amount, expected) => {
    expect(rangeState(amount, range)).toEqual(expected);
  });
});
