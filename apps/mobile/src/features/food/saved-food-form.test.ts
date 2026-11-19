import type { Food } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { EMPTY_FORM, savedFoodForm, savedFoodInput } from "./saved-food-form";

// A protein bar's label as typed: one 50 g bar
const typed = {
  ...EMPTY_FORM,
  name: " Protein bar ",
  brand: "",
  servingLabel: "1 bar",
  servingGrams: "50",
  kcal: "200",
  proteinG: "20",
  carbsG: "22,5",
  fatG: "7",
  fibreG: "",
};

describe("savedFoodInput", () => {
  it("reads the label as typed, with a decimal comma, no brand and no fibre (#164)", () => {
    expect(savedFoodInput(typed, "0627735001234")).toEqual({
      input: {
        name: "Protein bar",
        barcode: "0627735001234",
        serving: { label: "1 bar", grams: 50 },
        perServing: { kcal: 200, proteinG: 20, carbsG: 22.5, fatG: 7 },
      },
    });
  });

  it("names what's missing or isn't a number", () => {
    expect(savedFoodInput({ ...typed, name: "" })).toEqual({ error: "Give the food a name" });
    expect(savedFoodInput({ ...typed, servingGrams: "0" })).toEqual({ error: "Enter the serving's weight in grams" });
    expect(savedFoodInput({ ...typed, kcal: "" })).toEqual({ error: "Enter the kcal per serving" });
    expect(savedFoodInput({ ...typed, fatG: "lots" })).toEqual({ error: "Enter the fat per serving" });
    expect(savedFoodInput({ ...typed, fibreG: "-1" })).toEqual({ error: "Enter the fibre per serving" });
  });
});

describe("savedFoodForm", () => {
  it("fills the form back from a Saved Food's first serving, to a tenth", () => {
    const food: Food = {
      source: "saved",
      id: "f1",
      name: "Protein bar",
      brand: "Simply",
      barcode: "0627735001234",
      per100g: { kcal: 316.667, proteinG: 33.333, carbsG: 50, fatG: 11.667, fibreG: 0 },
      servings: [{ label: "1 bar", grams: 60 }],
    };
    expect(savedFoodForm(food)).toEqual({
      name: "Protein bar",
      brand: "Simply",
      servingLabel: "1 bar",
      servingGrams: "60",
      kcal: "190",
      proteinG: "20",
      carbsG: "30",
      fatG: "7",
      fibreG: "0",
    });
  });
});
