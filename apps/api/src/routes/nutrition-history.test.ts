import type { Food, NutritionWeek } from "@fit/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRouteTestApi } from "../test/route-test-api";

const api = useRouteTestApi();

type Signed = Awaited<ReturnType<typeof api.signIn>>;

const food: Food = {
  source: "usda",
  id: "rice",
  name: "rice",
  per100g: { kcal: 200, proteinG: 10, carbsG: 0, fatG: 0, fibreG: 0 },
  servings: [],
};

// 200 kcal and 10 g of protein per 100 g
async function log(user: Signed, date: string, grams: number) {
  const { statusCode } = await user.post(`/days/${date}/food-entries`, { meal: "lunch", food, portion: { grams } });
  expect(statusCode).toBe(201);
}

const week = async (user: Signed, date = "today") => {
  const { statusCode, body } = await user.get(`/nutrition-history/${date}`);
  expect(statusCode).toBe(200);
  return body as NutritionWeek;
};

// The server's clock only, so nothing waiting on a timer stops. Wednesday 18 November 2026 in UTC
const setNow = (iso: string) => vi.setSystemTime(new Date(iso));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  setNow("2026-11-18T12:00:00Z");
});
afterEach(() => void vi.useRealTimers());

// ONBOARDED_PROFILE's targets in 2026, worked out by hand in days.test.ts
const targets = { kcal: 2650, proteinG: 160 };

describe("GET /nutrition-history/:date", () => {
  it("answers this week, Monday to Sunday, with each day's totals, targets and whether anything is logged", async () => {
    const user = await api.signIn();
    await log(user, "2026-11-16", 500);
    await log(user, "2026-11-16", 250);
    await log(user, "2026-11-18", 100);

    const empty = { totals: { kcal: 0, proteinG: 0 }, targets, logged: false };
    expect(await week(user)).toEqual({
      today: "2026-11-18",
      firstLoggedDate: "2026-11-16",
      days: [
        { date: "2026-11-16", totals: { kcal: 1500, proteinG: 75 }, targets, logged: true },
        { date: "2026-11-17", ...empty },
        { date: "2026-11-18", totals: { kcal: 200, proteinG: 10 }, targets, logged: true },
        { date: "2026-11-19", ...empty },
        { date: "2026-11-20", ...empty },
        { date: "2026-11-21", ...empty },
        { date: "2026-11-22", ...empty },
      ],
    });
  });

  it("answers the week any of its dates is in, with no food from the weeks around it", async () => {
    const user = await api.signIn();
    // A Sunday, then the Monday after it
    await log(user, "2026-11-15", 100);
    await log(user, "2026-11-16", 200);

    const before = await week(user, "2026-11-12");

    expect(before.days.map((day) => [day.date, day.totals.kcal])).toEqual([
      ["2026-11-09", 0],
      ["2026-11-10", 0],
      ["2026-11-11", 0],
      ["2026-11-12", 0],
      ["2026-11-13", 0],
      ["2026-11-14", 0],
      ["2026-11-15", 200],
    ]);
    expect((await week(user, "2026-11-15")).days).toEqual(before.days);
    expect((await week(user)).days[0].totals.kcal).toBe(400);
  });

  // Spec #188 stories 20 and 25: the week and its days are in the user's timezone. 03:30 on Monday in UTC is still
  // Sunday in Los Angeles
  it("answers this week in the user's timezone", async () => {
    setNow("2026-11-16T03:30:00Z");
    const west = await api.signIn();
    await west.patch("/user", { timeZone: "America/Los_Angeles" });
    const utc = await api.signIn();
    await utc.patch("/user", { timeZone: "UTC" });

    expect(await week(west)).toMatchObject({
      today: "2026-11-15",
      days: [{ date: "2026-11-09" }, {}, {}, {}, {}, {}, {}],
    });
    expect(await week(utc)).toMatchObject({
      today: "2026-11-16",
      days: [{ date: "2026-11-16" }, {}, {}, {}, {}, {}, {}],
    });
  });

  it("answers the first logged date whichever week is asked for, and none with nothing logged", async () => {
    const user = await api.signIn();
    expect((await week(user)).firstLoggedDate).toBeNull();

    await log(user, "2026-11-17", 100);
    // Logged late, for an earlier day
    await log(user, "2026-11-13", 100);

    expect((await week(user)).firstLoggedDate).toBe("2026-11-13");
    expect((await week(user, "2026-11-13")).firstLoggedDate).toBe("2026-11-13");
  });

  it("doesn't count water, or food since deleted, as logged", async () => {
    const user = await api.signIn();
    await user.put("/days/2026-11-17/water", { waterMl: 500 });
    const added = await user.post("/days/2026-11-16/food-entries", { meal: "lunch", food, portion: { grams: 100 } });
    await user.delete(`/food-entries/${(added.body as { id: string }).id}`);

    const { days, firstLoggedDate } = await week(user);

    expect(days.filter((day) => day.logged)).toEqual([]);
    expect(firstLoggedDate).toBeNull();
  });

  // Stories 14, 18 and 23: a day keeps the targets it had, and one before any were kept follows the current ones
  it("answers each day's own targets", async () => {
    const user = await api.signIn();
    await week(user);

    setNow("2026-11-19T12:00:00Z");
    // 1.6 g × 80 kg
    await user.patch("/user", { profile: { goal: "athletic" } });

    expect((await week(user)).days.map((day) => day.targets.proteinG)).toEqual([128, 128, 160, 128, 128, 128, 128]);
  });

  // A missed day's targets can't have changed, since any change would have kept them
  it("answers a day with none kept the targets of the nearest earlier day, its week's or not", async () => {
    const user = await api.signIn();
    await week(user);
    setNow("2026-11-20T12:00:00Z");
    await user.patch("/user", { profile: { goal: "athletic" } });
    setNow("2026-11-25T12:00:00Z");
    await user.patch("/user", { profile: { goal: "lose_fat" } });

    // Kept: Wednesday 18 and Friday 20, then Wednesday 25 a week later
    expect((await week(user, "2026-11-18")).days.map((day) => day.targets.proteinG)).toEqual([
      160, 160, 160, 160, 128, 128, 128,
    ]);
    expect((await week(user)).days.map((day) => day.targets.proteinG)).toEqual([128, 128, 160, 160, 160, 160, 160]);
  });

  it("keeps today's targets when it's read, as reading the day does", async () => {
    const user = await api.signIn();
    setNow("2026-11-19T12:00:00Z");
    await week(user);

    setNow("2026-11-20T12:00:00Z");
    await user.patch("/user", { profile: { goal: "athletic" } });

    expect((await week(user)).days[3].targets.proteinG).toBe(160);
  });

  it("never answers another user's food or targets", async () => {
    const other = await api.signIn();
    await log(other, "2026-11-16", 100);
    await other.patch("/user", { profile: { goal: "athletic" } });
    const user = await api.signIn();

    const { days, firstLoggedDate } = await week(user);

    expect(firstLoggedDate).toBeNull();
    expect(days.map((day) => day.logged)).not.toContain(true);
    expect(days[2].targets).toEqual(targets);
  });

  it("refuses a date that isn't a local date or today, and a user before onboarding", async () => {
    const user = await api.signIn();
    const fresh = await api.signIn({ onboarded: false });

    expect((await user.get("/nutrition-history/18-11-2026")).statusCode).toBe(400);
    expect((await fresh.get("/nutrition-history/today")).statusCode).toBe(403);
  });
});
