import type { Food } from "@fit/shared";
import { describe, expect, it } from "vitest";
import type { FoodSources } from "../food-sources";
import { useRouteTestApi } from "../test/route-test-api";

const usdaFood = (id: string, name: string, brand?: string): Food => ({
  source: "usda",
  id,
  name,
  ...(brand ? { brand } : {}),
  per100g: { kcal: 150, proteinG: 12, carbsG: 1, fatG: 10, fibreG: 0 },
  servings: [],
});

const eggWhole = usdaFood("748967", "Eggs, Grade A, Large, egg whole");
const eggWhite = usdaFood("747997", "Eggs, Grade A, Large, egg white");
const brandedEgg = usdaFood("2677671", "Egg", "Just");

const peanutButter: Food = {
  source: "off",
  id: "0068100084245",
  name: "Smooth Peanut Butter",
  brand: "Kraft",
  barcode: "0068100084245",
  per100g: { kcal: 600, proteinG: 20, carbsG: 20, fatG: 53.3, fibreG: 6.7 },
  servings: [{ label: "1 tbsp", grams: 15 }],
};
const snickersEgg: Food = { ...usdaFood("2575290", "Egg", "Snickers"), barcode: "040000449270" };

// Barcodes the outside sources answer for: Open Food Facts' peanut butter, then USDA's Snickers egg, as the real
// byBarcode would find them in that order. OUTAGE fails as both being down would
const OUTAGE = "99999999";
const byBarcode: Record<string, Food> = { "0068100084245": peanutButter, "040000449270": snickersEgg };

// Never reaches USDA: "egg" finds two generic foods and a branded one, and "outage" fails as USDA being down would
const foodSources: FoodSources = {
  async search(query) {
    if (query === "outage") throw new Error("USDA food search answered 503");
    return query === "egg" ? { branded: [brandedEgg], generic: [eggWhole, eggWhite] } : { generic: [], branded: [] };
  },
  async byBarcode(code) {
    if (code === OUTAGE) throw new Error("Open Food Facts answered 503");
    return byBarcode[code] ?? null;
  },
};

const api = useRouteTestApi({ foodSources });

describe("GET /foods/search", () => {
  it("lists generic foods before branded ones (spec #158 story 64)", async () => {
    const user = await api.signIn();
    const { statusCode, body } = await user.get("/foods/search?q=egg");
    expect(statusCode).toBe(200);
    expect(body).toEqual({ foods: [eggWhole, eggWhite, brandedEgg] });
  });

  it("finds nothing for words no source knows", async () => {
    const user = await api.signIn();
    expect((await user.get("/foods/search?q=zzzz")).body).toEqual({ foods: [] });
  });

  it("refuses an empty search", async () => {
    const user = await api.signIn();
    expect((await user.get("/foods/search?q=%20")).statusCode).toBe(400);
  });

  it("says the food source couldn't be reached, so the phone can say so", async () => {
    const user = await api.signIn();
    const { statusCode, body } = await user.get("/foods/search?q=outage");
    expect(statusCode).toBe(200);
    expect(body).toEqual({ foods: [], outsideUnavailable: true });
  });
});

// Spec #158 stories 65 to 68: the user's Saved Foods, then Open Food Facts, then USDA's branded foods
describe("GET /foods/barcode/:code", () => {
  it("finds a packaged food on Open Food Facts (story 66)", async () => {
    const user = await api.signIn();
    const { statusCode, body } = await user.get("/foods/barcode/0068100084245");
    expect(statusCode).toBe(200);
    expect(body).toEqual(peanutButter);
  });

  it("finds one only USDA's branded foods have", async () => {
    const user = await api.signIn();
    expect((await user.get("/foods/barcode/040000449270")).body).toEqual(snickersEgg);
  });

  it("answers 404 when no source has the barcode, so the phone can offer Create food (story 67)", async () => {
    const user = await api.signIn();
    const { statusCode, body } = await user.get("/foods/barcode/0000000000017");
    expect(statusCode).toBe(404);
    expect(body).toEqual({ error: "no food has that barcode" });
  });

  it("answers 502 when the sources can't be asked", async () => {
    const user = await api.signIn();
    expect((await user.get(`/foods/barcode/${OUTAGE}`)).statusCode).toBe(502);
  });

  it("refuses something that isn't a barcode", async () => {
    const user = await api.signIn();
    expect((await user.get("/foods/barcode/abc")).statusCode).toBe(400);
  });
});
