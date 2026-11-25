import { describe, expect, it } from "vitest";
import { amountOf, portionGrams, startingAmount, amountChosen, portionLine } from "./food-portion";

const bagel = { label: "1 bagel", grams: 81 };

describe("portionGrams", () => {
  it("takes grams as typed", () => {
    expect(portionGrams({ unit: "g" }, amountOf("150"))).toBe(150);
    expect(portionGrams({ unit: "g" }, amountOf("37.5"))).toBe(37.5);
  });

  it("weighs a count of the food's own serving: 2 bagels at 81 g are 162 g (spec #158 story 71)", () => {
    expect(portionGrams({ unit: "serving", serving: bagel }, amountOf("2"))).toBe(162);
    expect(portionGrams({ unit: "serving", serving: bagel }, amountOf("0.5"))).toBe(40.5);
  });

  it("reads a decimal comma, as a French or German keyboard types it", () => {
    expect(portionGrams({ unit: "serving", serving: bagel }, amountOf("1,5"))).toBe(121.5);
  });

  it("has no portion for nothing, zero or something that isn't a number", () => {
    expect(portionGrams({ unit: "g" }, amountOf(""))).toBeNull();
    expect(portionGrams({ unit: "g" }, amountOf("0"))).toBeNull();
    expect(portionGrams({ unit: "g" }, amountOf("abc"))).toBeNull();
    expect(portionGrams({ unit: "g" }, amountOf("-20"))).toBeNull();
  });
});

describe("startingAmount", () => {
  it("is written to be read, without digits nobody typed", () => {
    expect(startingAmount(2 / 3)).toBe("0.67");
    expect(startingAmount(0.25)).toBe("0.25");
    expect(startingAmount(0.0012)).toBe("0.0012");
    expect(startingAmount(1500)).toBe("1500");
  });
});

describe("amountChosen", () => {
  it("is the portion's own amount until the user changes it", () => {
    expect(amountChosen("0.67", 2 / 3)).toBe(2 / 3);
    expect(amountChosen("0.7", 2 / 3)).toBe(0.7);
    expect(amountChosen("", 2 / 3)).toBeNull();
    expect(amountChosen("0,5", null)).toBe(0.5);
  });
});

describe("portionLine", () => {
  it("says a portion's kcal, protein and fibre, kcal whole and grams to one place (spec #158 story 72)", () => {
    expect(portionLine({ kcal: 440.64, proteinG: 16.0056, carbsG: 88, fatG: 2, fibreG: 1.944 })).toBe(
      "441 kcal · 16 g protein · 1.9 g fibre",
    );
  });

  it("says 0 g of fibre for a food with none", () => {
    expect(portionLine({ kcal: 74, proteinG: 6.2, carbsG: 0.48, fatG: 4.98, fibreG: 0 })).toBe(
      "74 kcal · 6.2 g protein · 0 g fibre",
    );
  });

  it("separates thousands", () => {
    expect(portionLine({ kcal: 1234.4, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 })).toBe(
      "1,234 kcal · 0 g protein · 0 g fibre",
    );
  });
});
