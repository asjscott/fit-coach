import { randomUUID } from "node:crypto";
import type { Food, FoodEntry, SavedFoodInput, SavedMealInput } from "@fit/shared";
import { describe, expect, it } from "vitest";
import type { FoodSources } from "../food-sources";
import { type TestUser, useRouteTestApi } from "../test/route-test-api";

const usdaChicken: Food = {
  source: "usda",
  id: "171077",
  name: "Chicken breast, cooked",
  per100g: { kcal: 160, proteinG: 30, carbsG: 0, fatG: 4, fibreG: 0 },
  servings: [],
};

const foodSources: FoodSources = {
  search: async () => ({ generic: [usdaChicken], branded: [] }),
  byBarcode: async () => null,
};

const api = useRouteTestApi({ foodSources });

// One 60 g wrap holds 180 kcal, 6 g protein, 30 g carbs, 3 g fat and 3 g fibre
const wrapLabel: SavedFoodInput = {
  name: "Wrap",
  serving: { label: "1 wrap", grams: 60 },
  perServing: { kcal: 180, proteinG: 6, carbsG: 30, fatG: 3, fibreG: 3 },
};

// 300 g of chicken (480 kcal, 90 g protein) and 4 wraps (720 kcal, 24 g protein): 540 g, 1,200 kcal and 114 g protein.
// Over 4 servings, each is 135 g, 300 kcal and 28.5 g protein
async function chickenWraps(user: TestUser): Promise<SavedMealInput> {
  const wrap = (await user.post("/saved-foods", wrapLabel)).body as SavedMealInput["ingredients"][number]["food"];
  return {
    name: "Chicken wraps",
    servings: 4,
    ingredients: [
      { food: usdaChicken as typeof wrap, portion: { grams: 300 } },
      { food: wrap, portion: { serving: "1 wrap", count: 4 } },
    ],
  };
}

const makeSavedMeal = async (user: TestUser, input: object) => (await user.post("/saved-meals", input)).body as Food;
const addOne = async (user: TestUser, food: Food, count = 1) =>
  (
    await user.post("/days/today/food-entries", {
      meal: "lunch",
      food,
      portion: { serving: "1 serving", count },
    })
  ).body as FoodEntry;
const entriesToday = async (user: TestUser) =>
  ((await user.get("/days/today")).body as { meals: { entries: FoodEntry[] }[] }).meals.flatMap((m) => m.entries);

describe("POST /saved-meals", () => {
  it("makes a Saved Meal, offered as a food with one serving and its ingredients", async () => {
    const user = await api.signIn();
    const input = await chickenWraps(user);

    const { statusCode, body } = await user.post("/saved-meals", input);

    expect(statusCode).toBe(201);
    expect(body).toEqual({
      source: "saved_meal",
      id: expect.any(String),
      name: "Chicken wraps",
      per100g: expect.objectContaining({ kcal: expect.closeTo(222.222, 2), proteinG: expect.closeTo(21.111, 2) }),
      servings: [{ label: "1 serving", grams: 135 }],
      savedMeal: {
        servings: 4,
        gramsAllowed: false,
        ingredients: [
          { food: usdaChicken, portion: { grams: 300 } },
          {
            food: expect.objectContaining({ source: "saved", name: "Wrap" }),
            portion: { grams: 240, serving: { label: "1 wrap", count: 4 } },
          },
        ],
      },
    });
  });

  it("is safe to retry: the same request makes one Saved Meal, even sent at once", async () => {
    const user = await api.signIn();
    const input = { ...(await chickenWraps(user)), requestId: randomUUID() };

    const [a, b] = await Promise.all([user.post("/saved-meals", input), user.post("/saved-meals", input)]);
    const again = await user.post("/saved-meals", input);

    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 201]);
    expect(b.body).toEqual(a.body);
    expect(again).toEqual({ statusCode: 200, body: a.body });
    expect((await user.get("/foods/search?q=wraps")).body).toEqual({ foods: [a.body, usdaChicken] });
  });

  it("refuses no name, no servings, no ingredients, a serving a food doesn't have, or a Saved Meal as one", async () => {
    const user = await api.signIn();
    const input = await chickenWraps(user);
    const savedMeal = await makeSavedMeal(user, input);
    const refused = async (changes: object) =>
      expect((await user.post("/saved-meals", { ...input, ...changes })).statusCode).toBe(400);

    await refused({ name: " " });
    await refused({ servings: 0 });
    await refused({ cookedGrams: 0 });
    await refused({ ingredients: [] });
    await refused({ ingredients: [{ food: usdaChicken, portion: { serving: "1 breast", count: 1 } }] });
    await refused({ ingredients: [{ food: savedMeal, portion: { serving: "1 serving", count: 1 } }] });
  });
});

describe("finding a Saved Meal", () => {
  // Story 38: listed with the Saved Foods, and first in search, as they are
  it("lists it with the Saved Foods by name, and searches it before the outside sources", async () => {
    const user = await api.signIn();
    const savedMeal = await makeSavedMeal(user, await chickenWraps(user));
    const { body: almond } = await user.post("/saved-foods", { ...wrapLabel, name: "almond butter" });

    expect((await user.get("/saved-foods")).body).toMatchObject({ foods: [almond, savedMeal, { name: "Wrap" }] });
    expect((await user.get("/foods/search?q=CHICKEN")).body).toEqual({ foods: [savedMeal, usdaChicken] });
  });
});

describe("logging a Saved Meal", () => {
  it("logs servings as one Food Entry named after it, with its ingredients, and lists it in Recent", async () => {
    const user = await api.signIn();
    const savedMeal = await makeSavedMeal(user, await chickenWraps(user));

    const entry = await addOne(user, savedMeal, 1.5);

    expect(entry).toMatchObject({
      food: savedMeal,
      portion: { grams: 202.5, serving: { label: "1 serving", count: 1.5 } },
      nutrients: { kcal: expect.closeTo(450), proteinG: expect.closeTo(42.75) },
    });
    expect(await entriesToday(user)).toEqual([entry]);
    expect((await user.get("/foods/recent")).body).toEqual({ foods: [savedMeal] });
  });

  it("refuses grams, when logged and when changed", async () => {
    const user = await api.signIn();
    const savedMeal = await makeSavedMeal(user, await chickenWraps(user));
    const grams = { portion: { grams: 100 } };

    expect((await user.post("/days/today/food-entries", { meal: "lunch", food: savedMeal, ...grams })).statusCode).toBe(
      400,
    );
    // Nor does leaving out what it's made of get round it
    const bare = { ...savedMeal, savedMeal: undefined };
    expect((await user.post("/days/today/food-entries", { meal: "lunch", food: bare, ...grams })).statusCode).toBe(400);
    const entry = await addOne(user, savedMeal);
    expect((await user.patch(`/food-entries/${entry.id}`, grams)).statusCode).toBe(400);
  });

  it("can be changed, moved, copied to the next day and deleted like any other", async () => {
    const user = await api.signIn();
    const savedMeal = await makeSavedMeal(user, await chickenWraps(user));
    const { date: today } = (await user.get("/days/today")).body as { date: string };
    const yesterday = new Date(Date.parse(today) - 86_400_000).toISOString().slice(0, 10);
    const logged = (
      await user.post(`/days/${yesterday}/food-entries`, {
        meal: "lunch",
        food: savedMeal,
        portion: { serving: "1 serving", count: 1 },
      })
    ).body as FoodEntry;

    const changed = await user.patch(`/food-entries/${logged.id}`, {
      meal: "dinner",
      portion: { serving: "1 serving", count: 0.5 },
    });
    expect(changed.body).toMatchObject({ meal: "dinner", nutrients: { kcal: expect.closeTo(150) } });

    const copied = await user.post("/days/today/meals/dinner/copy-from-yesterday");
    expect(copied.body).toMatchObject({ entries: [{ date: today, food: savedMeal, portion: { grams: 67.5 } }] });

    expect((await user.delete(`/food-entries/${logged.id}`)).statusCode).toBe(204);
  });
});

// Story 40
describe("a Saved Meal's cooked weight", () => {
  const lunchOf = (food: Food, grams: number) => ({ meal: "lunch", food, portion: { grams } });

  it("sets its serving, and lets it be logged and changed by grams", async () => {
    const user = await api.signIn();
    const savedMeal = await makeSavedMeal(user, { ...(await chickenWraps(user)), cookedGrams: 1600 });

    expect(savedMeal).toMatchObject({
      servings: [{ label: "1 serving", grams: 400 }],
      savedMeal: { servings: 4, gramsAllowed: true },
    });
    // 350/1,600 of 1,200 kcal and 114 g protein
    const { statusCode, body } = await user.post("/days/today/food-entries", lunchOf(savedMeal, 350));
    expect(statusCode).toBe(201);
    expect(body).toMatchObject({
      portion: { grams: 350 },
      nutrients: { kcal: expect.closeTo(262.5), proteinG: expect.closeTo(24.9375) },
    });
    const changed = await user.patch(`/food-entries/${(body as FoodEntry).id}`, { portion: { grams: 800 } });
    expect(changed.body).toMatchObject({ nutrients: { kcal: expect.closeTo(600) } });
    expect(await addOne(user, savedMeal)).toMatchObject({
      portion: { grams: 400 },
      nutrients: { kcal: expect.closeTo(300) },
    });
  });

  it("can be added, changed and cleared, and the days already logged stay as they were", async () => {
    const user = await api.signIn();
    const input = await chickenWraps(user);
    const savedMeal = await makeSavedMeal(user, input);
    const update = async (changes: object) =>
      (await user.put(`/saved-meals/${savedMeal.id}`, { ...input, ...changes })).body as Food;
    const byServing = await addOne(user, savedMeal);

    const added = await update({ cookedGrams: 1600 });
    expect(added).toMatchObject({ servings: [{ grams: 400 }], savedMeal: { gramsAllowed: true } });
    const byGrams = (await user.post("/days/today/food-entries", lunchOf(added, 350))).body as FoodEntry;
    const changed = await update({ cookedGrams: 1200 });
    expect(changed).toMatchObject({ servings: [{ grams: 300 }], savedMeal: { gramsAllowed: true } });
    const cleared = await update({});
    expect(cleared).toEqual(savedMeal);

    expect(await entriesToday(user)).toEqual([byServing, byGrams]);
    expect((await user.post("/days/today/food-entries", lunchOf(cleared, 350))).statusCode).toBe(400);
    expect((await user.patch(`/food-entries/${byServing.id}`, { portion: { grams: 350 } })).statusCode).toBe(400);
    // The one logged by grams still can be: it's kept as it was when logged
    const regrammed = await user.patch(`/food-entries/${byGrams.id}`, { portion: { grams: 800 } });
    expect(regrammed.body).toMatchObject({ nutrients: { kcal: expect.closeTo(600) } });
  });
});

describe("PUT /saved-meals/:id and DELETE /saved-meals/:id", () => {
  // Story 36: neither changes a day already logged
  it("edits the name, servings and ingredients, and a Food Entry already logged stays as it was", async () => {
    const user = await api.signIn();
    const input = await chickenWraps(user);
    const savedMeal = await makeSavedMeal(user, input);
    const entry = await addOne(user, savedMeal);

    const edited = await user.put(`/saved-meals/${savedMeal.id}`, {
      name: "Just chicken",
      servings: 2,
      ingredients: [input.ingredients[0]],
    });

    expect(edited.statusCode).toBe(200);
    expect(edited.body).toMatchObject({
      id: savedMeal.id,
      name: "Just chicken",
      servings: [{ label: "1 serving", grams: 150 }],
      savedMeal: { servings: 2, ingredients: [{ food: usdaChicken, portion: { grams: 300 } }] },
    });
    expect((await user.get("/foods/search?q=just")).body).toMatchObject({ foods: [edited.body, usdaChicken] });
    expect(await entriesToday(user)).toEqual([entry]);
  });

  // Story 37
  it("keeps each ingredient as it was when added, whatever happens to the Saved Food", async () => {
    const user = await api.signIn();
    const input = await chickenWraps(user);
    const savedMeal = await makeSavedMeal(user, input);
    const wrap = input.ingredients[1].food;

    await user.put(`/saved-foods/${wrap.id}`, { ...wrapLabel, perServing: { ...wrapLabel.perServing, kcal: 999 } });
    await user.delete(`/saved-foods/${wrap.id}`);

    expect((await user.get("/saved-foods")).body).toEqual({ foods: [savedMeal] });
  });

  it("deletes it: no longer listed or found, and a Food Entry logged from it stays and can still change", async () => {
    const user = await api.signIn();
    const savedMeal = await makeSavedMeal(user, await chickenWraps(user));
    const entry = await addOne(user, savedMeal);

    expect((await user.delete(`/saved-meals/${savedMeal.id}`)).statusCode).toBe(204);

    expect((await user.get("/saved-foods")).body).toMatchObject({ foods: [{ name: "Wrap" }] });
    expect((await user.get("/foods/search?q=wraps")).body).toEqual({ foods: [usdaChicken] });
    expect(await entriesToday(user)).toEqual([entry]);
    const changed = await user.patch(`/food-entries/${entry.id}`, { portion: { serving: "1 serving", count: 2 } });
    expect(changed.body).toMatchObject({ nutrients: { kcal: expect.closeTo(600) } });
    expect((await user.delete(`/saved-meals/${savedMeal.id}`)).statusCode).toBe(404);
  });
});

describe("Saved Meals isolation", () => {
  it("never shows one user's Saved Meals to another, nor lets them change one", async () => {
    const owner = await api.signIn();
    const other = await api.signIn();
    const requestId = randomUUID();
    const input = { ...(await chickenWraps(owner)), requestId };
    const savedMeal = await makeSavedMeal(owner, input);

    expect((await other.get("/saved-foods")).body).toEqual({ foods: [] });
    expect((await other.get("/foods/search?q=wraps")).body).toEqual({ foods: [usdaChicken] });
    expect((await other.put(`/saved-meals/${savedMeal.id}`, input)).statusCode).toBe(404);
    expect((await other.delete(`/saved-meals/${savedMeal.id}`)).statusCode).toBe(404);
    // The same request id from another user is another Saved Meal
    const theirs = await other.post("/saved-meals", input);
    expect(theirs.statusCode).toBe(201);
    expect((theirs.body as Food).id).not.toBe(savedMeal.id);
  });
});
