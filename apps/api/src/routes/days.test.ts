import { ideaFood } from "@fit/engines";
import type { Day, Food, FoodEntry, User } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { localDate } from "../test/dates";
import { ONBOARDED_PROFILE, useRouteTestApi } from "../test/route-test-api";

const api = useRouteTestApi();

// ONBOARDED_PROFILE is 80 kg, 180 cm, born 1990, male, building muscle and lightly active. On a 2026 date its BMR is
// 10 × 80 + 6.25 × 180 − 5 × 36 + 5 = 1,750 kcal, and maintenance 1,750 × 1.375 = 2,406.25

describe("GET /days/:date", () => {
  // Spec #158 stories 20 to 30: Daily Targets from the profile, with nothing eaten yet
  it("answers the signed-in user's Daily Targets for the day, with nothing eaten", async () => {
    const user = await api.signIn();

    const { statusCode, body } = await user.get("/days/2026-11-18");

    expect(statusCode).toBe(200);
    expect(body).toEqual({
      date: "2026-11-18",
      // 2,406.25 × 1.1 = 2,646.875; carbs (2,650 − 160 × 4 − 64 × 9) ÷ 4 = 358.5; water 35 ml × 80 = 2,800
      targets: { kcal: 2650, proteinG: 160, fatG: 64, carbsG: 359, fibreG: 106, waterMl: 2750 },
      totals: { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fibreG: 0 },
      meals: [
        { meal: "breakfast", entries: [] },
        { meal: "lunch", entries: [] },
        { meal: "dinner", entries: [] },
        { meal: "snacks", entries: [] },
      ],
      waterMl: 0,
      ideas: expect.any(Array),
      ideaMeal: expect.stringMatching(/^(breakfast|lunch|dinner|snacks)$/),
    });
  });

  it("works the age out from the day's year", async () => {
    const user = await api.signIn();

    // 37 in 2027: 1,745 × 1.375 × 1.1 = 2,639.3
    expect(((await user.get("/days/2027-01-01")).body as Day).targets.kcal).toBe(2640);
  });

  // Story 4: a user with no Activity Level counts as lightly active until they answer
  it("counts a user who has no Activity Level as lightly active", async () => {
    // Sent as JSON, an undefined Activity Level is left out, as it is for a user onboarded before it existed
    const unanswered = await api.signIn({ profile: { ...ONBOARDED_PROFILE, activityLevel: undefined } });

    expect(((await unanswered.get("/days/2026-11-18")).body as Day).targets.kcal).toBe(2650);
  });

  // Story 30: the targets change as soon as the Goal, Activity Level or fibre target does
  it("follows a change of Goal, Activity Level or fibre target straight away", async () => {
    const user = await api.signIn();
    const targets = async () => ((await user.get("/days/2026-11-18")).body as Day).targets;

    await user.patch("/user", { profile: { goal: "lose_fat" } });
    // 2,406.25 × 0.8 = 1,925, halves up
    expect(await targets()).toMatchObject({ kcal: 1930, proteinG: 160 });

    await user.patch("/user", { profile: { activityLevel: "very_active" } });
    // 1,750 × 1.725 × 0.8 = 2,415, halves up
    expect((await targets()).kcal).toBe(2420);

    await user.patch("/user", { profile: { fibreTargetG: 30 } });
    expect((await targets()).fibreG).toBe(30);

    await user.patch("/user", { profile: { fibreTargetG: null } });
    // 40 g per 1,000 kcal of 2,420
    expect((await targets()).fibreG).toBe(97);
  });

  // Story 77: "today" is today in the user's timezone. Kiritimati (UTC+14) and Pago Pago (UTC−11) are always on
  // different dates
  it("answers today in the user's timezone", async () => {
    const east = await api.signIn();
    const west = await api.signIn();
    await east.patch("/user", { timeZone: "Pacific/Kiritimati" });
    await west.patch("/user", { timeZone: "Pacific/Pago_Pago" });

    expect(((await east.get("/days/today")).body as Day).date).toBe(localDate("Pacific/Kiritimati"));
    expect(((await west.get("/days/today")).body as Day).date).toBe(localDate("Pacific/Pago_Pago"));
  });

  it("refuses a date that isn't a local date or today", async () => {
    const user = await api.signIn();

    expect((await user.get("/days/18-11-2026")).statusCode).toBe(400);
  });

  it("is refused before onboarding, when there's nothing to work the targets out from", async () => {
    const user = await api.signIn({ onboarded: false });

    expect((await user.get("/days/today")).statusCode).toBe(403);
  });
});

// A made-up food that's all protein or all kcal, to eat a day's target down to a set amount left
const eaten = (name: string, per100g: Partial<Food["per100g"]>): Food => ({
  source: "usda",
  id: name,
  name,
  per100g: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0, ...per100g },
  servings: [],
});

type Signed = Awaited<ReturnType<typeof api.signIn>>;
const today = async (user: Signed) => (await user.get("/days/today")).body as Day;

describe("GET /days/:date Food Ideas", () => {
  // Spec #158 stories 34 and 56: two Food Ideas to fill what's left, with nothing eaten
  it("offers two Food Ideas with their portion and what it holds", async () => {
    const user = await api.signIn();

    const { ideas } = await today(user);

    expect(ideas).toHaveLength(2);
    expect(ideas[0]).toMatchObject({ name: expect.any(String), portion: { label: expect.any(String) } });
    expect(ideas[0].nutrients.proteinG).toBeGreaterThan(0);
  });

  // Stories 6 and 7: never an idea the Diet rules out, or one with a food the user avoids
  it.each([
    [{ kind: "vegan", avoid: [] }, ["vegan"], []],
    [{ kind: "vegetarian", avoid: ["dairy"] }, ["vegetarian", "vegan"], ["dairy"]],
    [{ kind: "pescatarian", avoid: ["gluten", "dairy"] }, ["fish", "vegetarian", "vegan"], ["gluten", "dairy"]],
    [{ kind: "any", avoid: ["pork", "nuts", "dairy", "gluten"] }, ["meat", "fish", "vegetarian", "vegan"], ["pork"]],
  ])("offers only ideas a %j Diet allows", async (diet, kinds, avoided) => {
    const user = await api.signIn();
    await user.patch("/user", { profile: { diet } });

    const { ideas } = await today(user);

    expect(ideas).toHaveLength(2);
    for (const idea of ideas) {
      expect(kinds).toContain(idea.kind);
      expect(idea.contains.filter((food) => (avoided as string[]).includes(food))).toEqual([]);
    }
  });

  // Spec #188 story 11: none from the bottom of the protein range (144 to 192 g)
  it("offers none once protein is in range", async () => {
    const user = await api.signIn();
    const date = (await today(user)).date;
    await user.post(`/days/${date}/food-entries`, {
      meal: "lunch",
      food: eaten("protein", { proteinG: 100 }),
      portion: { grams: 143 },
    });
    expect((await today(user)).ideas).toHaveLength(2);

    await user.post(`/days/${date}/food-entries`, {
      meal: "lunch",
      food: eaten("protein", { proteinG: 100 }),
      portion: { grams: 1 },
    });

    expect((await today(user)).ideas).toEqual([]);
  });

  // Spec #188 story 12: never past the top of the kcal range (2,520 to 2,780). 2,600 leaves 180, then 2,750 leaves 30
  it("offers only ideas that fit under the top of the kcal range", async () => {
    const user = await api.signIn();
    const date = (await today(user)).date;
    const log = (grams: number) =>
      user.post(`/days/${date}/food-entries`, {
        meal: "dinner",
        food: eaten("kcal", { kcal: 500 }),
        portion: { grams },
      });

    await log(520);
    const { ideas } = await today(user);
    expect(ideas.length).toBeGreaterThan(0);
    expect(ideas.filter((idea) => idea.nutrients.kcal > 180)).toEqual([]);

    await log(30);
    expect((await today(user)).ideas).toEqual([]);
  });

  // Spec #158 "Diet and Food Ideas": Breakfast before 11:00, Lunch before 16:00, Dinner before 21:00, then Snacks, now
  // in the user's timezone. Tokyo and New York are 14 hours apart
  it("answers the meal for the time of day in the user's timezone", async () => {
    const hourIn = (timeZone: string) =>
      Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" }).format(new Date()));
    const mealAt = (hour: number) => (hour < 11 ? "breakfast" : hour < 16 ? "lunch" : hour < 21 ? "dinner" : "snacks");

    for (const timeZone of ["Asia/Tokyo", "America/New_York"]) {
      const user = await api.signIn();
      await user.patch("/user", { timeZone });

      expect((await today(user)).ideaMeal).toBe(mealAt(hourIn(timeZone)));
    }
  });

  // Story 58: Add logs an idea through the same route as any food, into the meal for the time of day
  it("logs an idea added as a Food Entry from source idea, holding what the idea's portion does", async () => {
    const user = await api.signIn();
    const { date, ideas, ideaMeal } = await today(user);
    const [idea] = ideas;

    const added = await user.post(`/days/${date}/food-entries`, {
      meal: ideaMeal,
      food: ideaFood(idea),
      portion: { serving: idea.portion.label, count: 1 },
    });

    expect(added.statusCode).toBe(201);
    const entry = added.body as FoodEntry;
    expect(entry).toMatchObject({ meal: ideaMeal, food: { source: "idea", id: idea.id, name: idea.name } });
    expect(entry.nutrients.kcal).toBeCloseTo(idea.nutrients.kcal);
    expect(entry.nutrients.proteinG).toBeCloseTo(idea.nutrients.proteinG);
    expect((await today(user)).meals.find((m) => m.meal === ideaMeal)?.entries).toHaveLength(1);
  });
});

describe("PATCH /user", () => {
  // Spec #158 stories 1, 9 and 10: the Activity Level and the fibre target are saved, and the fibre target cleared
  it("saves the Activity Level and the fibre target, and clears the fibre target with null", async () => {
    const user = await api.signIn();

    await user.patch("/user", { profile: { activityLevel: "active", fibreTargetG: 45 } });
    expect(((await user.get("/user")).body as User).profile).toMatchObject({
      activityLevel: "active",
      fibreTargetG: 45,
    });

    await user.patch("/user", { profile: { fibreTargetG: null } });
    expect(((await user.get("/user")).body as User).profile).not.toHaveProperty("fibreTargetG");
  });

  // Spec #158 stories 6 and 7: the Diet and the foods to avoid, any and none until the user chooses
  it("saves the Diet and the foods to avoid", async () => {
    const user = await api.signIn();
    expect(((await user.get("/user")).body as User).profile).not.toHaveProperty("diet");

    await user.patch("/user", { profile: { diet: { kind: "vegetarian", avoid: ["dairy", "nuts"] } } });

    expect(((await user.get("/user")).body as User).profile.diet).toEqual({
      kind: "vegetarian",
      avoid: ["dairy", "nuts"],
    });
  });

  it("refuses an unknown Diet or food to avoid", async () => {
    const user = await api.signIn();

    expect((await user.patch("/user", { profile: { diet: { kind: "keto", avoid: [] } } })).statusCode).toBe(400);
    expect((await user.patch("/user", { profile: { diet: { kind: "any", avoid: ["eggs"] } } })).statusCode).toBe(400);
  });

  it("refuses an unknown Activity Level or a fibre target out of range", async () => {
    const user = await api.signIn();

    expect((await user.patch("/user", { profile: { activityLevel: "athlete" } })).statusCode).toBe(400);
    expect((await user.patch("/user", { profile: { fibreTargetG: 5 } })).statusCode).toBe(400);
  });
});
