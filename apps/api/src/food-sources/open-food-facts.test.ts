import { describe, expect, it } from "vitest";
import eggoWaffles from "./fixtures/off-product-eggo-waffles.json";
import kraftDinner from "./fixtures/off-product-kraft-dinner-no-nutrition.json";
import peanutButter from "./fixtures/off-product-kraft-peanut-butter.json";
import notFound from "./fixtures/off-product-not-found.json";
import { offProductFood } from "./open-food-facts";

// Saved real responses from Open Food Facts' /api/v2/product/{barcode}, Canadian products, trimmed to the nutrients
describe("offProductFood", () => {
  it("maps a Canadian product into the food shape, per 100 g, with its label serving (#164)", () => {
    expect(offProductFood(peanutButter)).toEqual({
      source: "off",
      id: "0068100084245",
      name: "Smooth Peanut Butter",
      brand: "Kraft",
      barcode: "0068100084245",
      per100g: { kcal: 600, proteinG: 20, carbsG: 20, fatG: 53.3333333333333, fibreG: 6.66666666666667 },
      servings: [{ label: "1 tbsp", grams: 15 }],
    });
  });

  it("calls a serving given only in grams one serving", () => {
    expect(offProductFood(eggoWaffles)).toMatchObject({
      name: "Eggo original",
      brand: "Eggo",
      servings: [{ label: "1 serving", grams: 70 }],
    });
  });

  it("finds nothing for a barcode it doesn't know, or a product with no nutrition to count", () => {
    expect(offProductFood(notFound)).toBeNull();
    expect(offProductFood(kraftDinner)).toBeNull();
  });
});
