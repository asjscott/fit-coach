import type { Day, Food, FoodProposal } from "@fit/shared";
import { describe, expect, it } from "vitest";
import type { FoodSources } from "../food-sources";
import { useRouteTestApi } from "../test/route-test-api";

// Per 100 g: 143 kcal, 12.6 g protein; a large egg is 50 g
const egg: Food = {
  source: "coach",
  id: "egg-boiled",
  name: "Egg, boiled",
  per100g: { kcal: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5, fibreG: 0 },
  servings: [{ label: "1 large egg", grams: 50 }],
};

// Per 100 g: 290 kcal, 9 g protein, 7 g fibre
const toast: Food = {
  source: "coach",
  id: "toast-whole-wheat",
  name: "Toast, whole-wheat",
  per100g: { kcal: 290, proteinG: 9, carbsG: 50, fatG: 4, fibreG: 7 },
  servings: [],
};

// The calendar day before a local date
const dayBefore = (date: string) => {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
};

// Never reaches Gemini: "yesterday I had two eggs and toast" is two foods at breakfast the day before, "a slice of toast
// for lunch" is one at today's lunch, and "outage" fails as Gemini being down would. Its parse can be taken away,
// as it is without a Gemini key
const parses = new Map<string, (today: string) => FoodProposal[]>([
  [
    "yesterday I had two eggs and toast",
    (today) => [
      { date: dayBefore(today), meal: "breakfast", food: egg, portion: { serving: "1 large egg", count: 2 } },
      { date: dayBefore(today), meal: "breakfast", food: toast, portion: { grams: 60 } },
    ],
  ],
  ["a slice of toast for lunch", (today) => [{ date: today, meal: "lunch", food: toast, portion: { grams: 30 } }]],
]);
const foodSources: FoodSources = {
  search: async () => ({ generic: [], branded: [] }),
  async parse(text, today) {
    if (text === "outage") throw new Error("Gemini answered 503");
    return parses.get(text)?.(today) ?? [];
  },
};
const parse = foodSources.parse;

const api = useRouteTestApi({ foodSources });

const todayUtc = () => new Date().toISOString().slice(0, 10);

type TestUser = Awaited<ReturnType<typeof api.signIn>>;
const dayOf = async (user: TestUser, date: string) => (await user.get(`/days/${date}`)).body as Day;
const entriesOf = (day: Day) => day.meals.flatMap((m) => m.entries);

describe("Tell the coach", () => {
  // Spec #158 stories 80 and 81: a sentence becomes dated proposals, and nothing is logged until they're confirmed
  it("turns a sentence into dated proposals without logging anything", async () => {
    const user = await api.signIn();
    const today = todayUtc();

    const { statusCode, body } = await user.post("/tell-the-coach", {
      text: "yesterday I had two eggs and toast",
      today,
    });

    expect(statusCode).toBe(200);
    expect(body).toEqual({
      proposals: [
        { date: dayBefore(today), meal: "breakfast", food: egg, portion: { serving: "1 large egg", count: 2 } },
        { date: dayBefore(today), meal: "breakfast", food: toast, portion: { grams: 60 } },
      ],
    });
    expect(entriesOf(await dayOf(user, dayBefore(today)))).toEqual([]);
    expect(entriesOf(await dayOf(user, today))).toEqual([]);
  });

  // Confirming logs each proposal through the ordinary Food Entry add route, to its own day and meal
  it("logs confirmed proposals to their days and meals", async () => {
    const user = await api.signIn();
    const today = todayUtc();
    const yesterday = (
      (await user.post("/tell-the-coach", { text: "yesterday I had two eggs and toast", today })).body as {
        proposals: FoodProposal[];
      }
    ).proposals;
    const lunch = (
      (await user.post("/tell-the-coach", { text: "a slice of toast for lunch", today })).body as {
        proposals: FoodProposal[];
      }
    ).proposals;

    for (const { date, meal, food, portion } of [...yesterday, ...lunch]) {
      expect((await user.post(`/days/${date}/food-entries`, { meal, food, portion })).statusCode).toBe(201);
    }

    const before = await dayOf(user, dayBefore(today));
    // Two large eggs (100 g) and 60 g of toast
    expect(before.meals.find((m) => m.meal === "breakfast")!.entries).toMatchObject([
      { food: egg, portion: { grams: 100, serving: { label: "1 large egg", count: 2 } }, nutrients: { kcal: 143 } },
      { food: toast, portion: { grams: 60 }, nutrients: { kcal: 174 } },
    ]);
    expect(before.totals.kcal).toBe(317);
    const now = await dayOf(user, today);
    expect(now.meals.find((m) => m.meal === "lunch")!.entries).toMatchObject([{ food: toast, portion: { grams: 30 } }]);
    expect(entriesOf(now)).toHaveLength(1);
  });

  it("answers no proposals for words with no food in them", async () => {
    const user = await api.signIn();
    const { statusCode, body } = await user.post("/tell-the-coach", { text: "hello there", today: todayUtc() });
    expect(statusCode).toBe(200);
    expect(body).toEqual({ proposals: [] });
  });

  it("refuses a today that isn't one the user can log for, and empty words", async () => {
    const user = await api.signIn();
    expect(
      (await user.post("/tell-the-coach", { text: "a slice of toast for lunch", today: "2020-01-01" })).statusCode,
    ).toBe(400);
    expect((await user.post("/tell-the-coach", { text: "  ", today: todayUtc() })).statusCode).toBe(400);
  });

  it("answers 502 when the parser can't be reached", async () => {
    const user = await api.signIn();
    const { statusCode } = await user.post("/tell-the-coach", { text: "outage", today: todayUtc() });
    expect(statusCode).toBe(502);
  });

  // Story 83 and "Keys": without a Gemini key the phone learns the box is unavailable, and parsing is refused
  it("says whether it's available, and is unavailable without a parser", async () => {
    const user = await api.signIn();
    expect((await user.get("/tell-the-coach")).body).toEqual({ available: true });

    foodSources.parse = undefined;
    try {
      expect((await user.get("/tell-the-coach")).body).toEqual({ available: false });
      const refused = await user.post("/tell-the-coach", { text: "a slice of toast for lunch", today: todayUtc() });
      expect(refused.statusCode).toBe(503);
    } finally {
      foodSources.parse = parse;
    }
  });
});
