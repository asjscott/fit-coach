import type { Food, SavedFoodInput } from "@fit/shared";
import { describe, expect, it } from "vitest";
import type { FoodSources } from "../food-sources";
import { useRouteTestApi } from "../test/route-test-api";

// What Open Food Facts has for the peanut butter's barcode
const offPeanutButter: Food = {
  source: "off",
  id: "0068100084245",
  name: "Smooth Peanut Butter",
  brand: "Kraft",
  barcode: "0068100084245",
  per100g: { kcal: 600, proteinG: 20, carbsG: 20, fatG: 53.3, fibreG: 6.7 },
  servings: [{ label: "1 tbsp", grams: 15 }],
};

const usdaEgg: Food = {
  source: "usda",
  id: "748967",
  name: "Eggs, Grade A, Large, egg whole",
  per100g: { kcal: 148, proteinG: 12.4, carbsG: 1, fatG: 10, fibreG: 0 },
  servings: [],
};

// Never reaches the network: the outside sources know only the peanut butter's barcode, and "egg" in search
const foodSources: FoodSources = {
  search: async (query) => {
    if (query === "bar") throw new Error("USDA food search answered 503");
    return query === "egg" ? { generic: [usdaEgg], branded: [] } : { generic: [], branded: [] };
  },
  byBarcode: async (code) => (code === offPeanutButter.barcode ? offPeanutButter : null),
};

const api = useRouteTestApi({ foodSources });

// A protein bar's label: one 50 g bar holds 200 kcal, 20 g protein, 22 g carbs, 7 g fat and 9 g fibre
const UNKNOWN_BARCODE = "0627735001234";
const proteinBar: SavedFoodInput = {
  name: "Protein bar, chocolate",
  brand: "Simply",
  barcode: UNKNOWN_BARCODE,
  serving: { label: "1 bar", grams: 50 },
  perServing: { kcal: 200, proteinG: 20, carbsG: 22, fatG: 7, fibreG: 9 },
};

describe("POST /saved-foods (Create food)", () => {
  // Spec #158 stories 67 and 68: a barcode no source has, made from its label, is found by the next scan
  it("makes a Saved Food linked to the barcode, so the next lookup finds it", async () => {
    const user = await api.signIn();
    expect((await user.get(`/foods/barcode/${UNKNOWN_BARCODE}`)).statusCode).toBe(404);

    const created = await user.post("/saved-foods", proteinBar);

    expect(created.statusCode).toBe(201);
    // Per 100 g is twice the 50 g bar, and the label's serving is the food's first
    const savedBar = {
      source: "saved",
      id: expect.any(String),
      name: "Protein bar, chocolate",
      brand: "Simply",
      barcode: UNKNOWN_BARCODE,
      per100g: { kcal: 400, proteinG: 40, carbsG: 44, fatG: 14, fibreG: 18 },
      servings: [{ label: "1 bar", grams: 50 }],
    };
    expect(created.body).toEqual(savedBar);
    const lookup = await user.get(`/foods/barcode/${UNKNOWN_BARCODE}`);
    expect(lookup.statusCode).toBe(200);
    expect(lookup.body).toEqual(created.body);
  });

  // Spec #158, "Food sources": the user's own Saved Foods come before Open Food Facts
  it("is found ahead of Open Food Facts for a barcode both have", async () => {
    const user = await api.signIn();
    const { body: saved } = await user.post("/saved-foods", {
      ...proteinBar,
      name: "Peanut butter, my jar",
      barcode: "0068100084245",
    });

    expect((await user.get("/foods/barcode/0068100084245")).body).toEqual(saved);
  });

  it("is found however the phone reads its barcode: a UPC-A, or the same code as a 13-digit EAN", async () => {
    const user = await api.signIn();
    const { body: saved } = await user.post("/saved-foods", { ...proteinBar, barcode: "627735001234" });

    expect((await user.get("/foods/barcode/0627735001234")).body).toEqual(saved);
  });

  it("takes a label with no serving name or fibre as one serving with 0 g of fibre", async () => {
    const user = await api.signIn();
    const { body } = await user.post("/saved-foods", {
      name: "Rice crackers",
      serving: { grams: 20 },
      perServing: { kcal: 80, proteinG: 1, carbsG: 17, fatG: 0.5 },
    });
    expect(body).toMatchObject({
      per100g: { kcal: 400, proteinG: 5, carbsG: 85, fatG: 2.5, fibreG: 0 },
      servings: [{ label: "1 serving", grams: 20 }],
    });
    expect(body).not.toHaveProperty("barcode");
  });

  it("refuses a second Saved Food with the same barcode (409)", async () => {
    const user = await api.signIn();
    await user.post("/saved-foods", proteinBar);
    expect((await user.post("/saved-foods", { ...proteinBar, name: "Another bar" })).statusCode).toBe(409);
  });

  it("refuses a label with no name, no grams or a bad barcode", async () => {
    const user = await api.signIn();
    expect((await user.post("/saved-foods", { ...proteinBar, name: " " })).statusCode).toBe(400);
    expect((await user.post("/saved-foods", { ...proteinBar, serving: { grams: 0 } })).statusCode).toBe(400);
    expect((await user.post("/saved-foods", { ...proteinBar, barcode: "12ab" })).statusCode).toBe(400);
  });
});

describe("GET /foods/search with Saved Foods", () => {
  // Spec #158 story 69: Saved Foods matched by name come first
  it("lists the user's Saved Foods that match by name before the outside sources' foods", async () => {
    const user = await api.signIn();
    const { body: eggBites } = await user.post("/saved-foods", {
      ...proteinBar,
      name: "Egg bites",
      barcode: undefined,
    });
    await user.post("/saved-foods", proteinBar);

    // "egg" finds "Egg bites", whatever the case
    expect((await user.get("/foods/search?q=egg")).body).toEqual({ foods: [eggBites, usdaEgg] });
    // Every word must match, in any order
    expect((await user.get("/foods/search?q=chocolate%20protein")).body).toMatchObject({
      foods: [{ name: "Protein bar, chocolate" }],
    });
  });

  it("still lists the Saved Foods when the outside source is down, saying it couldn't be searched", async () => {
    const user = await api.signIn();
    const { body: bar } = await user.post("/saved-foods", proteinBar);

    // The fake source fails for "bar"
    const { statusCode, body } = await user.get("/foods/search?q=bar");
    expect(statusCode).toBe(200);
    expect(body).toEqual({ foods: [bar], outsideUnavailable: true });
  });
});

describe("GET /saved-foods", () => {
  it("lists the user's Saved Foods by name", async () => {
    const user = await api.signIn();
    await user.post("/saved-foods", proteinBar);
    await user.post("/saved-foods", { ...proteinBar, name: "Almond butter", barcode: undefined });

    const { body } = await user.get("/saved-foods");
    expect(body).toMatchObject({ foods: [{ name: "Almond butter" }, { name: "Protein bar, chocolate" }] });
  });
});

describe("PUT /saved-foods/:id and DELETE /saved-foods/:id", () => {
  // Spec #158 stories 70 and 75: fixing a label never changes a day already logged
  it("edits a Saved Food, and a Food Entry already logged from it stays as it was", async () => {
    const user = await api.signIn();
    const { body: bar } = (await user.post("/saved-foods", proteinBar)) as { body: Food };
    const { body: logged } = await user.post("/days/today/food-entries", {
      meal: "snacks",
      food: bar,
      portion: { serving: "1 bar", count: 1 },
    });

    const edited = await user.put(`/saved-foods/${bar.id}`, {
      ...proteinBar,
      serving: { label: "1 bar", grams: 60 },
      perServing: { kcal: 240, proteinG: 18, carbsG: 30, fatG: 8, fibreG: 6 },
    });

    expect(edited.statusCode).toBe(200);
    expect(edited.body).toMatchObject({
      id: bar.id,
      per100g: { kcal: 400, proteinG: 30, carbsG: 50, fatG: 13.333, fibreG: 10 },
      servings: [{ label: "1 bar", grams: 60 }],
    });
    expect((await user.get(`/foods/barcode/${UNKNOWN_BARCODE}`)).body).toEqual(edited.body);
    const { body: day } = (await user.get("/days/today")) as { body: { meals: { entries: unknown[] }[] } };
    expect(day.meals.flatMap((m) => m.entries)).toEqual([logged]);
  });

  it("deletes a Saved Food: no longer listed or found, and a Food Entry logged from it stays", async () => {
    const user = await api.signIn();
    const { body: bar } = (await user.post("/saved-foods", proteinBar)) as { body: Food };
    const { body: logged } = await user.post("/days/today/food-entries", {
      meal: "snacks",
      food: bar,
      portion: { grams: 25 },
    });

    expect((await user.delete(`/saved-foods/${bar.id}`)).statusCode).toBe(204);

    expect((await user.get("/saved-foods")).body).toEqual({ foods: [] });
    expect((await user.get(`/foods/barcode/${UNKNOWN_BARCODE}`)).statusCode).toBe(404);
    const { body: day } = (await user.get("/days/today")) as { body: { meals: { entries: unknown[] }[] } };
    expect(day.meals.flatMap((m) => m.entries)).toEqual([logged]);
    expect((await user.delete(`/saved-foods/${bar.id}`)).statusCode).toBe(404);
  });

  it("refuses to move a Saved Food's barcode onto one another already has (409)", async () => {
    const user = await api.signIn();
    await user.post("/saved-foods", proteinBar);
    const { body: other } = (await user.post("/saved-foods", { ...proteinBar, barcode: "12345670" })) as {
      body: Food;
    };
    expect((await user.put(`/saved-foods/${other.id}`, proteinBar)).statusCode).toBe(409);
  });
});

// Spec #158 story 85: Saved Foods are the user's alone
describe("Saved Foods isolation", () => {
  it("never shows one user's Saved Foods to another, nor lets them change one", async () => {
    const owner = await api.signIn();
    const other = await api.signIn();
    const { body: bar } = (await owner.post("/saved-foods", proteinBar)) as { body: Food };

    expect((await other.get(`/foods/barcode/${UNKNOWN_BARCODE}`)).statusCode).toBe(404);
    expect((await other.get("/foods/search?q=protein")).body).toEqual({ foods: [] });
    expect((await other.get("/saved-foods")).body).toEqual({ foods: [] });
    expect((await other.put(`/saved-foods/${bar.id}`, proteinBar)).statusCode).toBe(404);
    expect((await other.delete(`/saved-foods/${bar.id}`)).statusCode).toBe(404);
    // The other user can link the same barcode to a food of their own
    expect((await other.post("/saved-foods", proteinBar)).statusCode).toBe(201);
    expect((await owner.get(`/foods/barcode/${UNKNOWN_BARCODE}`)).body).toEqual(bar);
  });
});
