import { describe, expect, it } from "vitest";
import appleFoundation from "./fixtures/usda-search-apple-foundation.json";
import eggBranded from "./fixtures/usda-search-egg-branded.json";
import eggGeneric from "./fixtures/usda-search-egg-generic.json";
import snickersEggByUpc from "./fixtures/usda-upc-snickers-egg.json";
import { usdaBarcodeFood, usdaSearchFoods } from "./usda";

// Saved real responses from FoodData Central's /foods/search, trimmed to a few foods (fetched with the public DEMO_KEY)
describe("usdaSearchFoods", () => {
  it("maps a generic search into the food shape, per 100 g, with no servings (#162)", () => {
    expect(usdaSearchFoods(eggGeneric)).toEqual([
      {
        source: "usda",
        id: "747997",
        name: "Eggs, Grade A, Large, egg white",
        per100g: { kcal: 55, proteinG: 10.7, carbsG: 2.36, fatG: 0, fibreG: 0 },
        servings: [],
      },
      {
        source: "usda",
        id: "748967",
        name: "Eggs, Grade A, Large, egg whole",
        per100g: { kcal: 148, proteinG: 12.4, carbsG: 0.96, fatG: 9.96, fibreG: 0 },
        servings: [],
      },
      {
        source: "usda",
        id: "174901",
        name: "Bagels, egg",
        per100g: { kcal: 278, proteinG: 10.6, carbsG: 53, fatG: 2.1, fibreG: 2.3 },
        servings: [],
      },
    ]);
  });

  it("counts a food with no fibre figure as 0 g of fibre (spec #158 story 74)", () => {
    const [eggWhite] = usdaSearchFoods(eggGeneric);
    expect(eggWhite!.per100g.fibreG).toBe(0);
  });

  it("takes the Atwater energy when a Foundation food has no plain Energy figure", () => {
    expect(usdaSearchFoods(appleFoundation)[0]!.per100g).toEqual({
      kcal: 64.7,
      proteinG: 0.148,
      carbsG: 15.7,
      fatG: 0.162,
      fibreG: 2.08,
    });
  });

  it("gives a branded food its brand, barcode and label serving in grams, in readable case", () => {
    expect(usdaSearchFoods(eggBranded)).toEqual([
      {
        // Its label serving comes in capitals, and its grams as 31.200000762939453
        source: "usda",
        id: "2575290",
        name: "Egg",
        brand: "Snickers",
        barcode: "040000449270",
        per100g: { kcal: 513, proteinG: 6.41, carbsG: 57.7, fatG: 28.8, fibreG: 3.2 },
        servings: [{ label: "1 egg", grams: 31.2 }],
      },
      {
        source: "usda",
        id: "2171141",
        name: "Egg",
        brand: "Galerie",
        barcode: "768395547691",
        per100g: { kcal: 367, proteinG: 0, carbsG: 90, fatG: 0, fibreG: 0 },
        servings: [{ label: "30 pieces", grams: 30 }],
      },
      {
        // Its serving is in millilitres, which has no weight to go on
        source: "usda",
        id: "2677671",
        name: "Egg",
        brand: "Just",
        barcode: "191011000605",
        per100g: { kcal: 159, proteinG: 11.4, carbsG: 2.27, fatG: 11.4, fibreG: 0 },
        servings: [],
      },
      {
        source: "usda",
        id: "2421434",
        name: "Egg bagels, egg",
        brand: "Lender's",
        barcode: "076800006924",
        per100g: { kcal: 272, proteinG: 9.88, carbsG: 54.3, fatG: 1.23, fibreG: 1.2 },
        servings: [{ label: "1 bagel", grams: 81 }],
      },
    ]);
  });
});

// A saved real /foods/search response for a GTIN/UPC (query gtinUpc:040000449270, Branded, with the public DEMO_KEY)
describe("usdaBarcodeFood", () => {
  const snickersEgg = {
    source: "usda",
    id: "2575290",
    name: "Egg",
    brand: "Snickers",
    barcode: "040000449270",
    per100g: { kcal: 513, proteinG: 6.41, carbsG: 57.7, fatG: 28.8, fibreG: 3.2 },
    servings: [{ label: "1 egg", grams: 31.2 }],
  };

  it("maps the branded food with that UPC into the food shape (#164)", () => {
    expect(usdaBarcodeFood(snickersEggByUpc, "040000449270")).toEqual(snickersEgg);
  });

  it("matches a UPC-A read as a 13-digit EAN, as iPhones read them", () => {
    expect(usdaBarcodeFood(snickersEggByUpc, "0040000449270")).toEqual(snickersEgg);
  });

  it("finds nothing when no food in the answer has that barcode", () => {
    expect(usdaBarcodeFood(eggBranded, "068100084245")).toBeNull();
  });
});
