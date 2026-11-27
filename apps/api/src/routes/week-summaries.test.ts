import { randomUUID } from "node:crypto";
import type { Food, Set, WeekSummary, Workout } from "@fit/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type TestUser, ONBOARDED_PROFILE, useRouteTestApi } from "../test/route-test-api";
import { assessmentWorkout } from "../test/workouts";

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

// A Workout started at this moment, an hour long, of these Exercises' Sets as [kg, reps]
async function liftAt(user: TestUser, iso: string, exercises: Record<string, [number, number][]>) {
  setNow(iso);
  const startedAt = new Date(iso);
  const endedAt = new Date(startedAt.getTime() + 60 * 60 * 1000).toISOString();
  const workout: Workout = {
    id: randomUUID(),
    startedAt: startedAt.toISOString(),
    endedAt,
    workoutExercises: Object.entries(exercises).map(([slug, sets]) => ({
      slug,
      loadType: "external",
      sets: sets.map(([kg, reps]) => ({ kind: "external", kg, reps, loggedAt: endedAt })),
    })),
  };
  expect((await user.post("/workouts", workout)).statusCode).toBe(201);
}

// The harness's dumbbells-at-home user, assessed on Friday 6 November 2026, so their Block starts on Monday 2 November
// and its deload week is the week of Monday 30 November. The row's Working Level is 14 kg × 8 and the goblet squat's
// 12 kg × 8; the floor press's best is 12 kg × 5
async function assessedUser() {
  const user = await signInAt();
  setNow("2026-11-06T12:00:00Z");
  expect((await user.post("/workouts", assessmentWorkout(3))).statusCode).toBe(201);
  return user;
}

async function checkInOn(user: TestUser, date: string, sleep: number, energy: number, soreness: number) {
  setNow(`${date}T08:00:00Z`);
  const checkedInAt = new Date().toISOString();
  expect((await user.put(`/check-ins/${date}`, { sleep, energy, soreness, checkedInAt })).statusCode).toBe(200);
}

async function weighInOn(user: TestUser, date: string, weight: number) {
  setNow(`${date}T08:00:00Z`);
  expect((await user.put(`/weigh-ins/${date}`, { weight, unit: "kg" })).statusCode).toBe(200);
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
      kcal: {
        average: 2625,
        min: 2520,
        max: 2780,
        state: "in",
        days: [
          { date: "2026-11-10", kcal: 2650, state: "in" },
          { date: "2026-11-12", kcal: 2600, state: "in" },
        ],
      },
      protein: { average: 131, min: 144, max: 192, state: "below" },
      // 20 Sets of goblet squats: quads and glutes at 20, abs at 10
      weeklyBudget: {
        met: 3,
        muscles: 9,
        short: [
          { muscle: "hamstrings", sets: 0, budget: 14 },
          { muscle: "chest", sets: 0, budget: 14 },
          { muscle: "lats", sets: 0, budget: 14 },
          { muscle: "upper_back", sets: 0, budget: 14 },
          { muscle: "side_delts", sets: 0, budget: 9 },
          { muscle: "calves", sets: 0, budget: 5 },
        ],
      },
      coach: {
        sentence: "A full week.",
        line: "Every Workout done, and calories in range but protein short.",
      },
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
      weeklyBudget: { met: 0, muscles: 9, short: expect.any(Array) },
      coach: { sentence: "A short week.", line: "1 of 3 Workouts done." },
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

  // Onboarded on Monday 2 November, the whole week was the user's: planned in full, and counted in the streak
  it("counts the first week in full when the user onboarded on its Monday", async () => {
    const user = await signInAt("2026-11-02T08:00:00Z");
    await trainAt(user, "2026-11-03T08:00:00Z");
    await trainAt(user, "2026-11-05T08:00:00Z");

    setNow("2026-11-09T12:00:00Z");
    expect(await summary(user, "2026-11-02")).toMatchObject({
      monday: "2026-11-02",
      partWeek: false,
      workouts: { done: 2, planned: 3 },
      streak: 1,
      coach: { sentence: "A short week." },
    });
  });

  // 17 Sets of goblet squats: quads and glutes at 17, over their 14, and abs at 8.5, just short of their 9
  it("lists the Muscles short of their Weekly Budget with their credited Sets, leaving out those that met it", async () => {
    const user = await signInAt();
    await trainAt(user, "2026-11-09T08:00:00Z", 14);
    await trainAt(user, "2026-11-11T08:00:00Z", 3);

    setNow("2026-11-16T12:00:00Z");
    expect((await summary(user, "2026-11-09")).weeklyBudget).toEqual({
      met: 2,
      muscles: 9,
      short: [
        { muscle: "hamstrings", sets: 0, budget: 14 },
        { muscle: "chest", sets: 0, budget: 14 },
        { muscle: "lats", sets: 0, budget: 14 },
        { muscle: "upper_back", sets: 0, budget: 14 },
        { muscle: "side_delts", sets: 0, budget: 9 },
        { muscle: "abs", sets: 8.5, budget: 9 },
        { muscle: "calves", sets: 0, budget: 5 },
      ],
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

describe("GET /week-summaries/:monday, its progress", () => {
  it("lists the week's PRs and the Working Levels that moved up or down", async () => {
    const user = await assessedUser();
    // Every Set at the row's target: up 1 rep. The floor press beats its best. Two Misses in a row on the goblet
    // squat: its target down 2 reps, as a Load Step down is too big
    await liftAt(user, "2026-11-10T08:00:00Z", {
      "one-arm-dumbbell-row": [
        [14, 8],
        [14, 8],
      ],
      "dumbbell-floor-press": [[14, 6]],
      "goblet-squat": [
        [12, 5],
        [12, 5],
      ],
    });
    await liftAt(user, "2026-11-12T08:00:00Z", {
      "goblet-squat": [
        [12, 5],
        [12, 5],
      ],
    });

    setNow("2026-11-16T12:00:00Z");
    const { prs, moves, coach } = await summary(user, "2026-11-09");
    expect(prs).toEqual([{ slug: "dumbbell-floor-press", measure: "e1rm", best: 16.8, previous: 14 }]);
    expect(moves).toEqual([
      { slug: "one-arm-dumbbell-row", direction: "up", change: "target-up", level: { unit: "kg", kg: 14, reps: 9 } },
      { slug: "goblet-squat", direction: "down", change: "target-down", level: { unit: "kg", kg: 12, reps: 6 } },
    ]);
    expect(coach.sentence).toBe("A short week, but a PR.");
  });

  it("leaves out the PRs and moves of a week with none", async () => {
    const user = await assessedUser();
    await trainAt(user, "2026-11-10T08:00:00Z", 3, "dumbbell-lateral-raise");
    setNow("2026-11-16T12:00:00Z");

    const week = await summary(user, "2026-11-09");

    expect(week).not.toHaveProperty("prs");
    expect(week).not.toHaveProperty("moves");
  });
});

describe("GET /week-summaries/:monday, the deload week", () => {
  it("says the Block's deload week is one, and no other week", async () => {
    const user = await assessedUser();
    await trainAt(user, "2026-11-24T08:00:00Z");
    await trainAt(user, "2026-12-01T08:00:00Z");

    setNow("2026-12-07T12:00:00Z");
    const deload = await summary(user, "2026-11-30");
    expect(deload.deload).toBe(true);
    expect(deload.coach.sentence).toBe("A deload week, lighter on purpose.");
    expect(await summary(user, "2026-11-23")).not.toHaveProperty("deload");
  });

  it("has no deload week before the first Assessment", async () => {
    const user = await signInAt();
    await trainAt(user, "2026-12-01T08:00:00Z");

    setNow("2026-12-07T12:00:00Z");
    expect(await summary(user, "2026-11-30")).not.toHaveProperty("deload");
  });
});

describe("GET /week-summaries/:monday, the body", () => {
  it("gives the change since the Weigh-in before, and the average Readiness against the week before", async () => {
    const user = await signInAt();
    expect((await user.patch("/user", { unit: "kg" })).statusCode).toBe(200);
    // Readiness is sleep + energy + (6 − soreness): 9 the week before, then 12 and 13
    await checkInOn(user, "2026-11-05", 3, 3, 3);
    await checkInOn(user, "2026-11-10", 4, 4, 2);
    await checkInOn(user, "2026-11-12", 5, 4, 2);
    // From the 80 kg the user onboarded with
    await weighInOn(user, "2026-11-12", 79.6);
    await trainAt(user, "2026-11-13T08:00:00Z");

    setNow("2026-11-16T12:00:00Z");
    const week = await summary(user, "2026-11-09");
    expect(week.weighIn).toEqual({ kg: 79.6, changeKg: -0.4 });
    expect(week.readiness).toEqual({ average: 12.5, previous: 9 });
    expect(week.coach.line).toBe("1 of 3 Workouts done, and 0.4 kg down.");
  });

  it("leaves out the Weigh-in and Readiness of a week with no Weigh-in and no Check-ins", async () => {
    const user = await signInAt();
    await checkInOn(user, "2026-11-05", 3, 3, 3);
    await trainAt(user, "2026-11-10T08:00:00Z");

    setNow("2026-11-23T12:00:00Z");
    const week = await summary(user, "2026-11-16");
    expect(week).not.toHaveProperty("weighIn");
    expect(week).not.toHaveProperty("readiness");
  });

  it("gives Readiness without the week before when that week had no Check-ins", async () => {
    const user = await signInAt();
    await checkInOn(user, "2026-11-10", 4, 4, 2);

    setNow("2026-11-16T12:00:00Z");
    expect((await summary(user, "2026-11-09")).readiness).toEqual({ average: 12 });
  });

  it("gives no Weigh-in change for the first Weigh-in", async () => {
    const user = await signInAt();

    setNow("2026-11-09T12:00:00Z");
    expect(await summary(user, "2026-11-02")).not.toHaveProperty("weighIn");
  });
});

describe("GET /week-summaries/:monday, each day's kcal", () => {
  it("gives each logged day's kcal against its own range", async () => {
    const user = await signInAt();
    // 1000 kcal, 2650 kcal and 3000 kcal, against 2520 to 2780
    await eatAt(user, "2026-11-09T20:00:00Z", "2026-11-09", 500);
    await eatAt(user, "2026-11-11T20:00:00Z", "2026-11-11", 1325);
    await eatAt(user, "2026-11-15T20:00:00Z", "2026-11-15", 1500);

    setNow("2026-11-16T12:00:00Z");
    expect((await summary(user, "2026-11-09")).kcal?.days).toEqual([
      { date: "2026-11-09", kcal: 1000, state: "below" },
      { date: "2026-11-11", kcal: 2650, state: "in" },
      { date: "2026-11-15", kcal: 3000, state: "over" },
    ]);
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
