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
