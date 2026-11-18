import { describe, expect, it } from "vitest";
import { portionNutrients } from "./food-portion";

// A whole egg, per 100 g, as USDA gives it
const egg = { kcal: 148, proteinG: 12.4, carbsG: 0.96, fatG: 9.96, fibreG: 0 };

describe("portionNutrients", () => {
  it("scales a food's per-100 g figures to the portion's grams: a 50 g egg is half of 100 g", () => {
    const portion = portionNutrients(egg, 50);
    expect(portion.kcal).toBeCloseTo(74);
    expect(portion.proteinG).toBeCloseTo(6.2);
    expect(portion.carbsG).toBeCloseTo(0.48);
    expect(portion.fatG).toBeCloseTo(4.98);
    expect(portion.fibreG).toBe(0);
  });

  it("counts two 81 g bagels as 162 g", () => {
    const bagel = { kcal: 272, proteinG: 9.88, carbsG: 54.3, fatG: 1.23, fibreG: 1.2 };
    expect(portionNutrients(bagel, 162).kcal).toBeCloseTo(440.64);
    expect(portionNutrients(bagel, 162).fibreG).toBeCloseTo(1.944);
  });

  it("holds nothing for no grams", () => {
    expect(portionNutrients(egg, 0)).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 });
  });
});
