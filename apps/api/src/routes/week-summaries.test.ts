import { randomUUID } from "node:crypto";
import type { Food, Set, WeekSummary, Workout } from "@fit/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type TestUser, ONBOARDED_PROFILE, useRouteTestApi } from "../test/route-test-api";

const api = useRouteTestApi();

// The server's clock only, so nothing waiting on a timer stops
const setNow = (iso: string) => vi.setSystemTime(new Date(iso));
beforeEach(() => void vi.useFakeTimers({ toFake: ["Date"] }));
afterEach(() => void vi.useRealTimers());

// Weeks of November 2026: Monday 2 (onboarding, a Wednesday), Monday 9 and Monday 16
const ONBOARDED = "2026-11-04T12:00:00Z";

// A user onboarded at this moment, in this timezone
async function signInAt(iso = ONBOARDED, timeZone = "UTC", profile = ONBOARDED_PROFILE) {
  setNow(iso);
  const user = await api.signIn({ profile });
  expect((await user.patch("/user", { timeZone })).statusCode).toBe(200);
  return user;
}

const set = (loggedAt: string): Set => ({ kind: "external", kg: 14, reps: 10, loggedAt });

// A Workout started at this moment, an hour long, of so many Sets of goblet squats (quads and glutes)
async function trainAt(user: TestUser, iso: string, sets = 3, slug = "goblet-squat") {
  setNow(iso);
  const startedAt = new Date(iso);
  const endedAt = new Date(startedAt.getTime() + 60 * 60 * 1000).toISOString();
  const workout: Workout = {
    id: randomUUID(),
    startedAt: startedAt.toISOString(),
    endedAt,
    workoutExercises: [{ slug, loadType: "external", sets: Array.from({ length: sets }, () => set(endedAt)) }],
  };
  expect((await user.post("/workouts", workout)).statusCode).toBe(201);
}

// 200 kcal and 10 g of protein per 100 g
const rice: Food = {
  source: "usda",
  id: "rice",
  name: "rice",
  per100g: { kcal: 200, proteinG: 10, carbsG: 0, fatG: 0, fibreG: 0 },
  servings: [],
};

// Food logged for a date, at this moment
async function eatAt(user: TestUser, iso: string, date: string, grams: number) {
  setNow(iso);
  const { statusCode } = await user.post(`/days/${date}/food-entries`, {
    meal: "lunch",
    food: rice,
    portion: { grams },
  });
  expect(statusCode).toBe(201);
}

async function summary(user: TestUser, monday: string) {
  const { statusCode, body } = await user.get(`/week-summaries/${monday}`);
  expect(statusCode).toBe(200);
  return body as WeekSummary;
}

// ONBOARDED_PROFILE's targets in 2026 (days.test.ts): 2650 kcal, its range 2520 to 2780, and 160 g of protein, its
// range 144 to 192. Its Weekly Budget, building muscle 3 days a week: 14 Sets for each of the 6 main Muscles, 9 for side
// delts and abs, and 5 for calves, so 9 Muscles
describe("GET /week-summaries/:monday", () => {
  it("sums up a full week", async () => {
    const user = await signInAt();
    await trainAt(user, "2026-11-09T08:00:00Z", 14);
    await trainAt(user, "2026-11-11T08:00:00Z");
    await trainAt(user, "2026-11-13T08:00:00Z");
    // 2650 kcal and 132.5 g, then 2600 kcal and 130 g: only the logged days count
    await eatAt(user, "2026-11-10T20:00:00Z", "2026-11-10", 1325);
    await eatAt(user, "2026-11-12T20:00:00Z", "2026-11-12", 1300);

    setNow("2026-11-16T12:00:00Z");
    expect(await summary(user, "2026-11-09")).toEqual({
      monday: "2026-11-09",
      sunday: "2026-11-15",
      seen: false,
      partWeek: false,
      workouts: { done: 3, planned: 3 },
      streak: 1,
      kcal: { average: 2625, min: 2520, max: 2780, state: "in" },
      protein: { average: 131, min: 144, max: 192, state: "below" },
      // 20 Sets of goblet squats: quads and glutes at 20, abs at 10
      weeklyBudget: { met: 3, muscles: 9 },
    });
  });

  // Short of daysPerWeek − 1, so the streak broke, and no food logged, so there's nothing to say about it
  it("sums up a short week, leaving out the food with none logged", async () => {
    const user = await signInAt();
    await trainAt(user, "2026-11-10T08:00:00Z");

    setNow("2026-11-16T12:00:00Z");
    expect(await summary(user, "2026-11-09")).toEqual({
      monday: "2026-11-09",
      sunday: "2026-11-15",
      seen: false,
      partWeek: false,
      workouts: { done: 1, planned: 3 },
      streak: 0,
      weeklyBudget: { met: 0, muscles: 9 },
    });
  });

  // Onboarded on a Wednesday: 5 days of 7 left, so 3 days a week plans 2 Workouts
  it("pro-rates the Workouts planned in the part first week, from the day the user onboarded", async () => {
    const user = await signInAt();

    setNow("2026-11-09T12:00:00Z");
    expect(await summary(user, "2026-11-02")).toMatchObject({
      monday: "2026-11-02",
      partWeek: true,
      workouts: { done: 0, planned: 2 },
      streak: 0,
    });
  });

  it("follows food logged late for a day of the week", async () => {
    const user = await signInAt();
    await eatAt(user, "2026-11-10T20:00:00Z", "2026-11-10", 1325);
    setNow("2026-11-16T12:00:00Z");
    expect((await summary(user, "2026-11-09")).kcal).toMatchObject({ average: 2650, state: "in" });

    // Logged on Monday for the Saturday before
    await eatAt(user, "2026-11-16T12:00:00Z", "2026-11-14", 500);

    expect((await summary(user, "2026-11-09")).kcal).toMatchObject({ average: 1825, state: "below" });
  });

  it("answers no summary for a week before the user onboarded, one not yet started, or a date not a Monday", async () => {
    const user = await signInAt();
    setNow("2026-11-16T12:00:00Z");

    for (const monday of ["2026-10-26", "2026-11-23", "2026-11-10"]) {
      expect((await user.get(`/week-summaries/${monday}`)).statusCode).toBe(404);
    }
  });
});

describe("GET /week-summaries/latest", () => {
  // Sunday 15 November 2026, 6 pm in Los Angeles, is 02:00 on Monday 16 in UTC
  it("answers the week before until 6 pm on Sunday in the user's timezone, then the week ending", async () => {
    const user = await signInAt(ONBOARDED, "America/Los_Angeles");

    setNow("2026-11-16T01:59:00Z");
    expect((await summary(user, "latest")).monday).toBe("2026-11-02");

    setNow("2026-11-16T02:00:00Z");
    expect((await summary(user, "latest")).monday).toBe("2026-11-09");

    // Monday in Los Angeles, and still the week just ended
    setNow("2026-11-16T12:00:00Z");
    expect((await summary(user, "latest")).monday).toBe("2026-11-09");
  });

  it("answers no summary while the week just ended is before the user onboarded", async () => {
    const user = await signInAt();

    expect((await user.get("/week-summaries/latest")).statusCode).toBe(404);
  });
});

describe("PUT /week-summaries/:monday/seen", () => {
  it("marks the week seen", async () => {
    const user = await signInAt();
    setNow("2026-11-16T12:00:00Z");
    expect((await summary(user, "latest")).seen).toBe(false);

    expect((await user.put("/week-summaries/2026-11-09/seen", {})).statusCode).toBe(204);

    expect((await summary(user, "latest")).seen).toBe(true);
  });

  it("keeps seen for each user and each week", async () => {
    const user = await signInAt();
    const other = await signInAt();
    setNow("2026-11-16T12:00:00Z");

    await user.put("/week-summaries/2026-11-09/seen", {});

    expect((await summary(user, "2026-11-09")).seen).toBe(true);
    expect((await summary(user, "2026-11-02")).seen).toBe(false);
    expect((await summary(other, "2026-11-09")).seen).toBe(false);
  });

  it("changes nothing when sent again", async () => {
    const user = await signInAt();
    setNow("2026-11-16T12:00:00Z");
    await user.put("/week-summaries/2026-11-09/seen", {});
    const once = await summary(user, "2026-11-09");

    setNow("2026-11-17T12:00:00Z");
    expect((await user.put("/week-summaries/2026-11-09/seen", {})).statusCode).toBe(204);

    expect(await summary(user, "2026-11-09")).toEqual(once);
  });
});
