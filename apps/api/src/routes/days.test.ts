import { ideaFood } from "@fit/engines";
import type { Day, Food, FoodEntry, User } from "@fit/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localDate } from "../test/dates";
import { ONBOARDED_PROFILE, useRouteTestApi } from "../test/route-test-api";

const api = useRouteTestApi();

// ONBOARDED_PROFILE is 80 kg, 180 cm, born 1990, male, building muscle and lightly active. On a 2026 date its BMR is
// 10 × 80 + 6.25 × 180 − 5 × 36 + 5 = 1,750 kcal, and maintenance 1,750 × 1.375 = 2,406.25

// Only Date, so nothing waiting on a timer stops
const setNow = (time: string | number) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(time);
};
afterEach(() => void vi.useRealTimers());

describe("GET /days/:date", () => {
  beforeEach(() => setNow("2026-11-18T12:00:00Z"));

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

  // Spec #188 story 18: a past day with no targets kept is judged against the current ones, not those of its own year
  it("works the age out from today's year, for a day before it with none kept too", async () => {
    setNow("2027-01-01T12:00:00Z");
    const user = await api.signIn();

    // 37 in 2027: 1,745 × 1.375 × 1.1 = 2,639.3
    expect(((await user.get("/days/today")).body as Day).targets.kcal).toBe(2640);
    expect(((await user.get("/days/2026-12-31")).body as Day).targets.kcal).toBe(2640);
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

// Pago Pago (UTC−11) is always at least a day behind Kiritimati (UTC+14), so moving a user there ends their day
const EARLIER = "Pacific/Pago_Pago";
const LATER = "Pacific/Kiritimati";

async function userOnEarlierDay() {
  const user = await api.signIn();
  await user.patch("/user", { timeZone: EARLIER });
  return { user, date: localDate(EARLIER) };
}
const endDay = (user: Signed) => user.patch("/user", { timeZone: LATER });
const targetsOn = async (user: Signed, date: string) => ((await user.get(`/days/${date}`)).body as Day).targets;

const weighIn = async (user: Signed, timeZone: string, weight: number) =>
  expect((await user.put(`/weigh-ins/${localDate(timeZone)}`, { weight, unit: "kg" })).statusCode).toBe(200);

describe("GET /days/:date kept Daily Targets", () => {
  // Spec #188 stories 14 and 17: a later Weigh-in or Goal doesn't rewrite the past
  it("keeps a day's targets once it's over, through a Weigh-in and a change of Goal", async () => {
    const { user, date } = await userOnEarlierDay();
    const then = await targetsOn(user, "today");
    expect(then.proteinG).toBe(160);

    await endDay(user);
    await weighIn(user, LATER, 90);
    await user.patch("/user", { profile: { goal: "athletic", fibreTargetG: 30 } });

    expect(await targetsOn(user, date)).toEqual(then);
    // 1.6 g × 90 kg
    expect(await targetsOn(user, "today")).toMatchObject({ proteinG: 144, fibreG: 30 });
  });

  // Story 15: the last targets the day had stand, without the day being read after the change
  it("keeps the last change made during the day", async () => {
    const { user, date } = await userOnEarlierDay();
    await targetsOn(user, "today");
    await weighIn(user, EARLIER, 90);
    await user.patch("/user", { profile: { goal: "athletic" } });

    await endDay(user);
    await user.patch("/user", { profile: { goal: "lose_fat" } });

    expect((await targetsOn(user, date)).proteinG).toBe(144);
  });

  it("keeps a Weigh-in made during the day, without the day being read after it", async () => {
    const { user, date } = await userOnEarlierDay();
    await weighIn(user, EARLIER, 90);

    await endDay(user);
    await user.patch("/user", { profile: { goal: "athletic" } });

    // 2 g × 90 kg
    expect((await targetsOn(user, date)).proteinG).toBe(180);
  });

  // The server's clock moved on, since moving the user's timezone is itself a change that keeps the new day's targets
  describe("on a new day", () => {
    const moveOnADay = () => vi.setSystemTime(Date.now() + 24 * 60 * 60 * 1000);

    it.each(["logged", "copied from yesterday"])("keeps the day's targets when food is %s", async (how) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const user = await api.signIn();
      const yesterday = localDate("UTC");
      const food = { meal: "lunch", food: eaten("rice", { kcal: 100 }), portion: { grams: 100 } };
      await user.post(`/days/${yesterday}/food-entries`, food);

      moveOnADay();
      const date = localDate("UTC");
      const added =
        how === "logged"
          ? await user.post("/days/today/food-entries", food)
          : await user.post(`/days/${date}/meals/lunch/copy-from-yesterday`);
      expect(added.statusCode).toBe(201);

      moveOnADay();
      await user.patch("/user", { profile: { goal: "athletic" } });

      expect((await targetsOn(user, date)).proteinG).toBe(160);
    });

    // The unique index lets one of them insert the day; the others must not fail on it
    it("keeps the day's targets when its first reads race", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const user = await api.signIn();
      moveOnADay();
      const date = localDate("UTC");

      const reads = await Promise.all(Array.from({ length: 12 }, () => user.get("/days/today")));
      expect(reads.map((read) => read.statusCode)).toEqual(reads.map(() => 200));

      moveOnADay();
      await user.patch("/user", { profile: { goal: "athletic" } });
      expect((await targetsOn(user, date)).proteinG).toBe(160);
    });
  });

  // Story 16
  it("judges food logged late against the day's own targets, leaving them as they were", async () => {
    const { user, date } = await userOnEarlierDay();
    await endDay(user);
    await user.patch("/user", { profile: { goal: "athletic" } });

    const added = await user.post(`/days/${date}/food-entries`, {
      meal: "lunch",
      food: eaten("protein", { proteinG: 100 }),
      portion: { grams: 160 },
    });

    expect(added.statusCode).toBe(201);
    const day = (await user.get(`/days/${date}`)).body as Day;
    expect(day.targets.proteinG).toBe(160);
    expect(day.totals.proteinG).toBe(160);
    // 160 g meets the day's own target
    expect(day.ideas).toEqual([]);
  });

  // Story 18: a day from before targets were kept is never stored, even by logging to it
  it("judges a past day with none kept against the current targets, and doesn't keep them", async () => {
    const user = await api.signIn();
    const date = localDate("UTC", 3);
    expect((await targetsOn(user, date)).proteinG).toBe(160);
    await user.post(`/days/${date}/food-entries`, {
      meal: "lunch",
      food: eaten("protein", { proteinG: 100 }),
      portion: { grams: 10 },
    });

    await user.patch("/user", { profile: { goal: "athletic" } });

    // 1.6 g × 80 kg
    expect((await targetsOn(user, date)).proteinG).toBe(128);
  });

  it("keeps a day to come following the current targets", async () => {
    const { user } = await userOnEarlierDay();
    await endDay(user);
    const tomorrow = localDate(LATER);
    // Back on the earlier date, the later one is still to come
    await user.patch("/user", { timeZone: EARLIER });
    await user.patch("/user", { profile: { goal: "athletic" } });

    expect((await targetsOn(user, tomorrow)).proteinG).toBe(128);
  });

  it("settles on the last change when reads and changes race", async () => {
    const { user, date } = await userOnEarlierDay();

    const answers = await Promise.all([
      ...Array.from({ length: 8 }, () => user.get("/days/today")),
      user.patch("/user", { profile: { goal: "athletic" } }),
      ...Array.from({ length: 8 }, () => user.get(`/days/${date}`)),
    ]);
    expect(answers.map((answer) => answer.statusCode)).toEqual(answers.map(() => 200));

    await endDay(user);
    await user.patch("/user", { profile: { goal: "lose_fat" } });
    expect((await targetsOn(user, date)).proteinG).toBe(128);
  });

  it("keeps a day's targets per user", async () => {
    const { user, date } = await userOnEarlierDay();
    const { user: other } = await userOnEarlierDay();
    await other.patch("/user", { profile: { goal: "athletic" } });

    await endDay(user);
    await endDay(other);

    expect((await targetsOn(user, date)).proteinG).toBe(160);
    expect((await targetsOn(other, date)).proteinG).toBe(128);
  });
});

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
