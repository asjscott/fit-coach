import type { Ingredient, IngredientFood } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { allowsGrams, portionNutrients, portionOf } from "./food-portion";
import { ingredientsAtPortion, portionChoiceOf, savedMealFood } from "./saved-meal";

// 100 g holds 100 kcal and 20 g protein
const chicken: IngredientFood = {
  source: "usda",
  id: "1",
  name: "Chicken",
  per100g: { kcal: 100, proteinG: 20, carbsG: 0, fatG: 2, fibreG: 0 },
  servings: [],
};
// One 200 g cup holds 400 kcal and 8 g protein
const rice: IngredientFood = {
  source: "saved",
  id: "2",
  name: "Rice",
  per100g: { kcal: 200, proteinG: 4, carbsG: 44, fatG: 1, fibreG: 1 },
  servings: [{ label: "1 cup", grams: 200 }],
};
// 600 g of chicken (600 kcal, 120 g protein) and 2 cups of rice (800 kcal, 16 g protein): 1,000 g in all
const ingredients: Ingredient[] = [
  { food: chicken, portion: { grams: 600 } },
  { food: rice, portion: { grams: 400, serving: { label: "1 cup", count: 2 } } },
];
const bowl = savedMealFood({ id: "m1", name: "Chicken and rice", servings: 4, ingredients });

// Spec #188, "Saved Meals"
describe("savedMealFood", () => {
  it("offers a Saved Meal as a food whose serving is its weight over its servings", () => {
    expect(bowl).toMatchObject({
      source: "saved_meal",
      id: "m1",
      name: "Chicken and rice",
      servings: [{ label: "1 serving", grams: 250 }],
      savedMeal: { servings: 4, ingredients, gramsAllowed: false },
    });
  });

  it("holds what its ingredients hold together: 1,400 kcal and 136 g protein over 4 servings", () => {
    const serving = portionNutrients(bowl.per100g, 250);
    expect(serving.kcal).toBeCloseTo(350);
    expect(serving.proteinG).toBeCloseTo(34);
    expect(serving.carbsG).toBeCloseTo(44);
  });
});

describe("logging a Saved Meal", () => {
  it("is by servings only: one and a half are 375 g", () => {
    expect(portionOf(bowl, { serving: "1 serving", count: 1.5 })).toEqual({
      grams: 375,
      serving: { label: "1 serving", count: 1.5 },
    });
    expect(portionOf(bowl, { grams: 100 })).toBeNull();
    expect(allowsGrams(bowl)).toBe(false);
    expect(allowsGrams(rice)).toBe(true);
  });
});

// Spec #188 story 40: 1,400 kcal of ingredients cooked down to 1,600 g in one pot
describe("a Saved Meal with a cooked weight", () => {
  const cooked = savedMealFood({ id: "m1", name: "Chicken and rice", servings: 4, ingredients, cookedGrams: 1600 });

  it("has a serving of the cooked weight over the servings, holding as much as without one", () => {
    expect(cooked.servings).toEqual([{ label: "1 serving", grams: 400 }]);
    expect(portionNutrients(cooked.per100g, 400).kcal).toBeCloseTo(350);
  });

  it("can be logged in grams: 350 g is 350/1,600 of its nutrients", () => {
    expect(allowsGrams(cooked)).toBe(true);
    expect(portionOf(cooked, { grams: 350 })).toEqual({ grams: 350 });
    const nutrients = portionNutrients(cooked.per100g, 350);
    expect(nutrients.kcal).toBeCloseTo(306.25);
    expect(nutrients.proteinG).toBeCloseTo(29.75);
  });

  it("opens to its ingredients at the grams logged: 400 g is a quarter of each", () => {
    expect(ingredientsAtPortion(cooked, 400)).toEqual([
      { food: chicken, portion: { grams: 150 } },
      { food: rice, portion: { grams: 100, serving: { label: "1 cup", count: 0.5 } } },
    ]);
  });
});

describe("ingredientsAtPortion", () => {
  it("shares out the ingredients to the portion: half a serving is an eighth of each", () => {
    expect(ingredientsAtPortion(bowl, 125)).toEqual([
      { food: chicken, portion: { grams: 75 } },
      { food: rice, portion: { grams: 50, serving: { label: "1 cup", count: 0.25 } } },
    ]);
  });

  it("has none for a food that isn't a Saved Meal", () => {
    expect(ingredientsAtPortion(rice, 100)).toEqual([]);
  });
});

describe("portionChoiceOf", () => {
  it("is the choice a portion was made by", () => {
    expect(portionChoiceOf({ grams: 600 })).toEqual({ grams: 600 });
    expect(portionChoiceOf({ grams: 400, serving: { label: "1 cup", count: 2 } })).toEqual({
      serving: "1 cup",
      count: 2,
    });
  });
});
