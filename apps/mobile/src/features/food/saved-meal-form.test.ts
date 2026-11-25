import type { Food, FoodEntry, Ingredient, IngredientFood, Portion } from "@fit/shared";
import { describe, expect, it } from "vitest";
import {
  EMPTY_SAVED_MEAL,
  ingredientFoods,
  ingredientLine,
  perServingLine,
  savedMealForm,
  savedMealFormFromEntries,
  savedMealInput,
} from "./saved-meal-form";

const chicken: IngredientFood = {
  source: "usda",
  id: "1",
  name: "Chicken",
  per100g: { kcal: 100, proteinG: 20, carbsG: 0, fatG: 2, fibreG: 0 },
  servings: [],
};
const rice: IngredientFood = {
  source: "saved",
  id: "2",
  name: "Rice",
  per100g: { kcal: 200, proteinG: 4, carbsG: 44, fatG: 1, fibreG: 1 },
  servings: [{ label: "1 cup", grams: 200 }],
};
// 1,400 kcal and 136 g protein together
const ingredients: Ingredient[] = [
  { food: chicken, portion: { grams: 600 } },
  { food: rice, portion: { grams: 400, serving: { label: "1 cup", count: 2 } } },
];
const form = { name: " Chicken and rice ", servings: "4", ingredients };
const bowl: Food = {
  source: "meal",
  id: "m1",
  name: "Chicken and rice",
  per100g: { kcal: 140, proteinG: 13.6, carbsG: 17.6, fatG: 1.6, fibreG: 0.4 },
  servings: [{ label: "1 serving", grams: 250 }],
  savedMeal: { servings: 4, ingredients, gramsAllowed: false },
};

describe("perServingLine", () => {
  // Spec #188 story 34
  it("says the kcal and protein per serving as it's built", () => {
    expect(perServingLine(form)).toBe("350 kcal · 34 g protein per serving");
    expect(perServingLine({ ...form, servings: "2,5" })).toBe("560 kcal · 54.4 g protein per serving");
  });

  it("says nothing without ingredients or a number of servings", () => {
    expect(perServingLine(EMPTY_SAVED_MEAL)).toBeNull();
    expect(perServingLine({ ...form, servings: "0" })).toBeNull();
  });
});

describe("savedMealInput", () => {
  it("sends the name, servings, and each ingredient with the portion it was chosen as", () => {
    expect(savedMealInput(form)).toEqual({
      input: {
        name: "Chicken and rice",
        servings: 4,
        ingredients: [
          { food: chicken, portion: { grams: 600 } },
          { food: rice, portion: { serving: "1 cup", count: 2 } },
        ],
      },
    });
  });

  it("says the first thing to fix", () => {
    expect(savedMealInput({ ...form, name: " " })).toEqual({ error: "Give the Saved Meal a name" });
    expect(savedMealInput({ ...form, servings: "" })).toEqual({ error: "Enter how many servings it makes" });
    expect(savedMealInput({ ...form, servings: "101" })).toEqual({ error: "A Saved Meal makes at most 100 servings" });
    expect(savedMealInput({ ...form, ingredients: [] })).toEqual({ error: "Add at least one ingredient" });
  });
});

describe("savedMealForm", () => {
  it("edits a Saved Meal from its name, servings and ingredients", () => {
    expect(savedMealForm(bowl)).toEqual({ name: "Chicken and rice", servings: "4", ingredients });
  });
});

// Story 33
describe("savedMealFormFromEntries", () => {
  const entry = (food: Food, portion: Portion): FoodEntry => ({
    id: food.id,
    date: "2026-11-24",
    meal: "dinner",
    loggedAt: "2026-11-24T18:00:00.000Z",
    food,
    portion,
    nutrients: food.per100g,
  });

  it("starts a Saved Meal, still to be named, from the logged foods and portions", () => {
    const entries = [
      entry(chicken, { grams: 150 }),
      entry(rice, { grams: 100, serving: { label: "1 cup", count: 0.5 } }),
    ];
    expect(savedMealFormFromEntries(entries)).toEqual({
      ...EMPTY_SAVED_MEAL,
      ingredients: [
        { food: chicken, portion: { grams: 150 } },
        { food: rice, portion: { grams: 100, serving: { label: "1 cup", count: 0.5 } } },
      ],
    });
  });

  it("adds a logged Saved Meal's own ingredients at the logged portion, in its place", () => {
    const entries = [
      entry(rice, { grams: 200, serving: { label: "1 cup", count: 1 } }),
      // One of the 4 servings: a quarter of each ingredient
      entry(bowl, { grams: 250, serving: { label: "1 serving", count: 1 } }),
      entry(chicken, { grams: 80 }),
    ];
    expect(savedMealFormFromEntries(entries).ingredients).toEqual([
      { food: rice, portion: { grams: 200, serving: { label: "1 cup", count: 1 } } },
      { food: chicken, portion: { grams: 150 } },
      { food: rice, portion: { grams: 100, serving: { label: "1 cup", count: 0.5 } } },
      { food: chicken, portion: { grams: 80 } },
    ]);
  });

  it("can be saved once it has a name and servings", () => {
    const started = savedMealFormFromEntries([entry(bowl, { grams: 500, serving: { label: "1 serving", count: 2 } })]);
    expect(savedMealInput({ ...started, name: "Bowl for two", servings: "2" })).toEqual({
      input: {
        name: "Bowl for two",
        servings: 2,
        ingredients: [
          { food: chicken, portion: { grams: 300 } },
          { food: rice, portion: { serving: "1 cup", count: 1 } },
        ],
      },
    });
  });
});

describe("ingredientFoods", () => {
  // Story 43
  it("leaves out Saved Meals", () => {
    expect(ingredientFoods([bowl, rice, chicken])).toEqual([rice, chicken]);
  });
});

describe("ingredientLine", () => {
  it("says an ingredient's portion and kcal", () => {
    expect(ingredientLine(ingredients[0])).toEqual({ name: "Chicken, 600 g", kcal: "600 kcal" });
    expect(ingredientLine(ingredients[1])).toEqual({ name: "Rice, 2 × 1 cup", kcal: "800 kcal" });
  });
});
