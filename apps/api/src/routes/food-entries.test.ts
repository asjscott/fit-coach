import type { Day, Food, FoodEntry } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { useRouteTestApi } from "../test/route-test-api";

const api = useRouteTestApi();

// Per 100 g: 140 kcal, 12 g protein, 1 g carbs, 10 g fat and no fibre; a large egg is 50 g
const egg: Food = {
  source: "usda",
  id: "748967",
  name: "Eggs, Grade A, Large, egg whole",
  per100g: { kcal: 140, proteinG: 12, carbsG: 1, fatG: 10, fibreG: 0 },
  servings: [{ label: "1 large", grams: 50 }],
};

// Per 100 g: 250 kcal, 10 g protein, 40 g carbs, 4 g fat and 8 g fibre
const toast: Food = {
  source: "usda",
  id: "2343",
  name: "Bread, whole-wheat",
  brand: "Dempster's",
  per100g: { kcal: 250, proteinG: 10, carbsG: 40, fatG: 4, fibreG: 8 },
  servings: [{ label: "1 slice", grams: 40 }],
};

// The local date in a timezone, so many days before today
const localDate = (timeZone: string, daysBefore = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(
    new Date(Date.now() - daysBefore * 24 * 60 * 60 * 1000),
  );

const today = () => localDate("UTC");

const dayOf = async (user: { get(url: string): Promise<{ body: unknown }> }, date: string) =>
  (await user.get(`/days/${date}`)).body as Day;

const mealOf = (day: Day, meal: string) => day.meals.find((m) => m.meal === meal)!.entries;

describe("POST /days/:date/food-entries", () => {
  // Spec #158 stories 49, 51, 75 and 76: a found food is logged into a meal, and the day's totals add up from it
  it("logs a food into a meal, and the day's meals and totals read it back", async () => {
    const user = await api.signIn();
    const date = today();

    const added = await user.post(`/days/${date}/food-entries`, {
      meal: "breakfast",
      food: egg,
      portion: { serving: "1 large", count: 2 },
    });
    await user.post(`/days/${date}/food-entries`, { meal: "lunch", food: toast, portion: { grams: 80 } });

    expect(added.statusCode).toBe(201);
    // Two large eggs are 100 g
    expect(added.body).toMatchObject({
      date,
      meal: "breakfast",
      food: egg,
      portion: { grams: 100, serving: { label: "1 large", count: 2 } },
      nutrients: { kcal: 140, proteinG: 12, carbsG: 1, fatG: 10, fibreG: 0 },
    });
    const day = await dayOf(user, date);
    expect(day.meals.map((m) => m.meal)).toEqual(["breakfast", "lunch", "dinner", "snacks"]);
    expect(mealOf(day, "breakfast")).toEqual([added.body]);
    // 80 g of toast: 200 kcal, 8 g protein, 32 g carbs, 3.2 g fat, 6.4 g fibre
    expect(mealOf(day, "lunch")).toMatchObject([
      { food: toast, portion: { grams: 80 }, nutrients: { kcal: 200, proteinG: 8, carbsG: 32, fibreG: 6.4 } },
    ]);
    expect(mealOf(day, "dinner")).toEqual([]);
    expect(day.totals).toEqual({ kcal: 340, proteinG: 20, carbsG: 33, fatG: 13.2, fibreG: 6.4 });
  });

  // Story 44 and "Rules for every write": today or one of the 6 days before it, in the user's timezone
  it("logs into today or the 6 days before it, and refuses any other date", async () => {
    const user = await api.signIn();
    const log = (date: string) =>
      user.post(`/days/${date}/food-entries`, { meal: "snacks", food: egg, portion: { grams: 50 } });

    expect((await log(localDate("UTC", 6))).statusCode).toBe(201);
    expect((await log("today")).statusCode).toBe(201);

    const tooOld = await log(localDate("UTC", 7));
    expect(tooOld.statusCode).toBe(400);
    expect(tooOld.body).toMatchObject({ message: "A Food Entry must be from the last 7 days" });
    expect((await log(localDate("UTC", -1))).statusCode).toBe(400);
    expect(mealOf(await dayOf(user, localDate("UTC", 7)), "snacks")).toEqual([]);
  });

  // Story 77: a user in Kiritimati (UTC+14) logs into today there, which is tomorrow in UTC for part of the day
  it("counts the days in the user's timezone", async () => {
    const user = await api.signIn();
    await user.patch("/user", { timeZone: "Pacific/Kiritimati" });
    const log = (date: string) =>
      user.post(`/days/${date}/food-entries`, { meal: "snacks", food: egg, portion: { grams: 50 } });

    expect((await log(localDate("Pacific/Kiritimati"))).statusCode).toBe(201);
    expect((await log(localDate("Pacific/Kiritimati", 7))).statusCode).toBe(400);
    expect(mealOf(await dayOf(user, "today"), "snacks")).toHaveLength(1);
  });

  // A log sent again after its answer was lost, with the same request id, logs nothing more
  it("logs a food once however often the same request is sent", async () => {
    const user = await api.signIn();
    const add = { meal: "snacks", food: egg, portion: { grams: 50 }, requestId: crypto.randomUUID() };

    const first = await user.post("/days/today/food-entries", add);
    const again = await user.post("/days/today/food-entries", add);
    await user.post("/days/today/food-entries", { ...add, requestId: crypto.randomUUID() });

    expect(first.statusCode).toBe(201);
    expect(again.statusCode).toBe(200);
    expect(again.body).toEqual(first.body);
    expect(mealOf(await dayOf(user, "today"), "snacks")).toHaveLength(2);
  });

  it("refuses a serving the food doesn't have", async () => {
    const user = await api.signIn();

    const { statusCode } = await user.post("/days/today/food-entries", {
      meal: "snacks",
      food: egg,
      portion: { serving: "1 slice", count: 1 },
    });

    expect(statusCode).toBe(400);
  });
});

type TestUser = Awaited<ReturnType<typeof api.signIn>>;

// Logs two large eggs into breakfast, answering the new Food Entry
const logEggs = async (user: TestUser, date = "today") =>
  (
    await user.post(`/days/${date}/food-entries`, {
      meal: "breakfast",
      food: egg,
      portion: { serving: "1 large", count: 2 },
    })
  ).body as FoodEntry;

describe("PATCH /food-entries/:id", () => {
  // Story 55: fixing a mistake
  it("changes a Food Entry's portion, working its nutrients out again from the food as it was logged", async () => {
    const user = await api.signIn();
    const entry = await logEggs(user);

    const changed = await user.patch(`/food-entries/${entry.id}`, { portion: { grams: 150 } });

    expect(changed.statusCode).toBe(200);
    expect(changed.body).toEqual({
      ...entry,
      portion: { grams: 150 },
      nutrients: { kcal: 210, proteinG: 18, carbsG: 1.5, fatG: 15, fibreG: 0 },
    });
    const day = await dayOf(user, entry.date);
    expect(mealOf(day, "breakfast")).toEqual([changed.body]);
    expect(day.totals).toEqual({ kcal: 210, proteinG: 18, carbsG: 1.5, fatG: 15, fibreG: 0 });
  });

  it("moves a Food Entry to another meal, keeping its portion", async () => {
    const user = await api.signIn();
    const entry = await logEggs(user);

    const moved = await user.patch(`/food-entries/${entry.id}`, { meal: "snacks" });

    expect(moved.body).toEqual({ ...entry, meal: "snacks" });
    const day = await dayOf(user, entry.date);
    expect(mealOf(day, "breakfast")).toEqual([]);
    expect(mealOf(day, "snacks")).toEqual([moved.body]);
  });

  it("refuses an empty change or a serving the food doesn't have", async () => {
    const user = await api.signIn();
    const entry = await logEggs(user);

    expect((await user.patch(`/food-entries/${entry.id}`, {})).statusCode).toBe(400);
    const badServing = await user.patch(`/food-entries/${entry.id}`, { portion: { serving: "1 slice", count: 1 } });
    expect(badServing.statusCode).toBe(400);
  });
});

describe("DELETE /food-entries/:id", () => {
  it("deletes a Food Entry, and the day's totals no longer count it", async () => {
    const user = await api.signIn();
    const entry = await logEggs(user);

    expect((await user.delete(`/food-entries/${entry.id}`)).statusCode).toBe(204);

    const day = await dayOf(user, entry.date);
    expect(mealOf(day, "breakfast")).toEqual([]);
    expect(day.totals).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0 });
    expect((await user.delete(`/food-entries/${entry.id}`)).statusCode).toBe(404);
  });
});

describe("Food Entries", () => {
  // Story 75 and ADR 0002: the entry keeps the food as it was logged
  it("keeps a Food Entry's snapshot when its food changes at the source", async () => {
    const user = await api.signIn();
    const entry = await logEggs(user);
    // The same egg, its figures since revised
    const revised: Food = { ...egg, per100g: { kcal: 160, proteinG: 13, carbsG: 1, fatG: 11, fibreG: 0 } };

    await user.post("/days/today/food-entries", { meal: "lunch", food: revised, portion: { grams: 100 } });
    const changed = (await user.patch(`/food-entries/${entry.id}`, { portion: { grams: 50 } })).body;

    const day = await dayOf(user, entry.date);
    expect(mealOf(day, "breakfast")).toEqual([changed]);
    expect(changed).toMatchObject({ food: egg, nutrients: { kcal: 70, proteinG: 6 } });
    expect(day.totals).toMatchObject({ kcal: 230, proteinG: 19 });
  });

  // "Rules for every write": everything is scoped to the signed-in user
  it("never shows or changes another user's Food Entries", async () => {
    const owner = await api.signIn();
    const other = await api.signIn();
    const entry = await logEggs(owner);

    expect(mealOf(await dayOf(other, entry.date), "breakfast")).toEqual([]);
    expect((await other.patch(`/food-entries/${entry.id}`, { meal: "snacks" })).statusCode).toBe(404);
    expect((await other.delete(`/food-entries/${entry.id}`)).statusCode).toBe(404);
    expect(mealOf(await dayOf(owner, entry.date), "breakfast")).toEqual([entry]);
  });

  // An entry logged today in Kiritimati (UTC+14) is on a date still to come in Pago Pago (UTC−11), 25 hours behind
  it("refuses to change or delete a Food Entry whose date can't be logged into", async () => {
    const user = await api.signIn();
    await user.patch("/user", { timeZone: "Pacific/Kiritimati" });
    const entry = await logEggs(user);
    await user.patch("/user", { timeZone: "Pacific/Pago_Pago" });

    expect((await user.patch(`/food-entries/${entry.id}`, { meal: "snacks" })).statusCode).toBe(400);
    expect((await user.delete(`/food-entries/${entry.id}`)).statusCode).toBe(400);
    expect(mealOf(await dayOf(user, entry.date), "breakfast")).toEqual([entry]);
  });
});

type Copied = { entries: FoodEntry[] };

describe("POST /days/:date/meals/:meal/copy-from-yesterday", () => {
  // Spec #158 stories 52 and 53: yesterday's breakfast goes into today's, after what's already there
  it("copies the day before's entries in that meal after any already there, never replacing them", async () => {
    const user = await api.signIn();
    const yesterday = localDate("UTC", 1);
    const date = today();
    const eggs = await logEggs(user, yesterday);
    await user.post(`/days/${yesterday}/food-entries`, { meal: "breakfast", food: toast, portion: { grams: 40 } });
    await user.post(`/days/${yesterday}/food-entries`, { meal: "lunch", food: toast, portion: { grams: 80 } });
    const already = await user.post(`/days/${date}/food-entries`, {
      meal: "breakfast",
      food: toast,
      portion: { grams: 120 },
    });

    const copied = await user.post(`/days/${date}/meals/breakfast/copy-from-yesterday`);

    expect(copied.statusCode).toBe(201);
    const breakfast = mealOf(await dayOf(user, date), "breakfast");
    expect(breakfast.map((e) => [e.food.name, e.portion.grams])).toEqual([
      ["Bread, whole-wheat", 120],
      ["Eggs, Grade A, Large, egg whole", 100],
      ["Bread, whole-wheat", 40],
    ]);
    expect(breakfast[0]).toEqual(already.body);
    // Each copy is a new Food Entry with the same snapshot
    expect(breakfast[1]).toMatchObject({ date, meal: "breakfast", food: egg, portion: eggs.portion });
    expect(breakfast[1].nutrients).toEqual(eggs.nutrients);
    expect(breakfast[1].id).not.toBe(eggs.id);
    expect(copied.body).toEqual({ entries: breakfast.slice(1) });
    expect(mealOf(await dayOf(user, date), "lunch")).toEqual([]);
  });

  // Story 54: today's portion can change without touching yesterday
  it("makes copies that change and delete without touching yesterday", async () => {
    const user = await api.signIn();
    const yesterday = localDate("UTC", 1);
    const eggs = await logEggs(user, yesterday);

    const first = (await user.post("/days/today/meals/breakfast/copy-from-yesterday")).body as Copied;
    await user.patch(`/food-entries/${first.entries[0].id}`, { portion: { grams: 150 } });
    const again = (await user.post("/days/today/meals/breakfast/copy-from-yesterday")).body as Copied;
    await user.delete(`/food-entries/${again.entries[0].id}`);

    expect(mealOf(await dayOf(user, yesterday), "breakfast")).toEqual([eggs]);
    expect(mealOf(await dayOf(user, today()), "breakfast")).toMatchObject([{ portion: { grams: 150 } }]);
  });

  // A copy sent again after its answer was lost, with the same request id, copies nothing more
  it("copies once however often the same request is sent", async () => {
    const user = await api.signIn();
    await logEggs(user, localDate("UTC", 1));
    const copy = { requestId: crypto.randomUUID() };

    const first = await user.post("/days/today/meals/breakfast/copy-from-yesterday", copy);
    const again = await user.post("/days/today/meals/breakfast/copy-from-yesterday", copy);

    expect(first.statusCode).toBe(201);
    expect(again.statusCode).toBe(200);
    expect(again.body).toEqual(first.body);
    expect(mealOf(await dayOf(user, "today"), "breakfast")).toHaveLength(1);
  });

  it("copies nothing from an empty meal, and refuses a date that can't be logged or a meal there isn't", async () => {
    const user = await api.signIn();
    await logEggs(user, localDate("UTC", 1));

    const nothing = await user.post("/days/today/meals/lunch/copy-from-yesterday");
    const tooOld = await user.post(`/days/${localDate("UTC", 7)}/meals/breakfast/copy-from-yesterday`);

    expect(nothing.body).toEqual({ entries: [] });
    expect(tooOld.statusCode).toBe(400);
    expect((await user.post("/days/today/meals/elevenses/copy-from-yesterday")).statusCode).toBe(400);
  });

  // "Rules for every write": everything is scoped to the signed-in user
  it("copies only the signed-in user's entries", async () => {
    const owner = await api.signIn();
    const other = await api.signIn();
    await logEggs(owner, localDate("UTC", 1));

    expect((await other.post("/days/today/meals/breakfast/copy-from-yesterday")).body).toEqual({ entries: [] });
  });
});

const recentOf = async (user: TestUser) => {
  const { statusCode, body } = await user.get("/foods/recent");
  expect(statusCode).toBe(200);
  return (body as { foods: Food[] }).foods;
};

describe("GET /foods/recent", () => {
  // Spec #158 story 62 and "Saved Foods and Recent": the foods logged, distinct and most recent first
  it("lists the foods the user has logged, each once, most recently logged first", async () => {
    const user = await api.signIn();
    const banana: Food = { ...toast, id: "1105314", name: "Bananas, raw", brand: undefined };
    await logEggs(user, localDate("UTC", 2));
    await user.post("/days/today/food-entries", { meal: "lunch", food: toast, portion: { grams: 40 } });
    await user.post("/days/today/food-entries", { meal: "snacks", food: banana, portion: { grams: 120 } });
    // Eggs again, logged last, but for an earlier day: Recent goes by when it was logged
    await logEggs(user, localDate("UTC", 1));

    expect(await recentOf(user)).toEqual([egg, banana, toast]);
  });

  it("is empty before anything is logged, and lists about 20 foods at most", async () => {
    const user = await api.signIn();
    expect(await recentOf(user)).toEqual([]);

    for (let i = 0; i < 25; i++) {
      await user.post("/days/today/food-entries", {
        meal: "snacks",
        food: { ...egg, id: `egg-${i}` },
        portion: { grams: 50 },
      });
    }

    const recent = await recentOf(user);
    expect(recent).toHaveLength(20);
    expect(recent[0].id).toBe("egg-24");
    expect(recent[19].id).toBe("egg-5");
  });

  // A food copied or logged from Recent is still the one food
  it("counts a copied food once", async () => {
    const user = await api.signIn();
    await logEggs(user, localDate("UTC", 1));
    await user.post("/days/today/meals/breakfast/copy-from-yesterday");

    expect(await recentOf(user)).toEqual([egg]);
  });

  it("lists only the signed-in user's foods", async () => {
    const owner = await api.signIn();
    const other = await api.signIn();
    await logEggs(owner);

    expect(await recentOf(other)).toEqual([]);
    expect(await recentOf(owner)).toEqual([egg]);
  });
});
