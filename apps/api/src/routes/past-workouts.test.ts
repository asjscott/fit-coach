import type { PlannedWorkout } from "@fit/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type TestUser, useRouteTestApi } from "../test/route-test-api";
import { assessmentPair, hoursAgo, lifted, workout } from "../test/workouts";

const api = useRouteTestApi();

const DAY_HOURS = 24;

// #129, user story 24: a Workout not logged live can start on any of the last 7 days. Its Sets are logged afterwards,
// an hour ago, as the fixtures' Sets are
describe("POST /workouts: a past Workout", () => {
  it("is refused when it starts more than 7 days before its Sets were logged", async () => {
    const user = await api.signIn();
    const tooEarly = workout(7 * DAY_HOURS + 2, [{ slug: "goblet-squat", sets: [lifted(14, 10), lifted(14, 9)] }]);

    const { statusCode } = await user.post("/workouts", tooEarly);

    expect(statusCode).toBe(400);
    expect((await user.get("/workouts")).body).toEqual([]);
  });

  it("is stored when it starts within 7 days of its Sets", async () => {
    const user = await api.signIn();
    const sixDaysAgo = workout(6 * DAY_HOURS, [{ slug: "goblet-squat", sets: [lifted(14, 10), lifted(14, 9)] }]);

    expect((await user.post("/workouts", sixDaysAgo)).statusCode).toBe(201);
  });

  // Spec #2: a Pending Workout uploads however late, so the 7 days count back from its Sets, not from the upload
  it("is stored when a Pending Workout uploads more than 7 days after it was logged", async () => {
    const user = await api.signIn();
    const loggedLongAgo = { ...lifted(14, 10), loggedAt: hoursAgo(9 * DAY_HOURS) };
    const pending = workout(9 * DAY_HOURS + 1, [{ slug: "goblet-squat", sets: [loggedLongAgo, loggedLongAgo] }]);

    expect((await user.post("/workouts", pending)).statusCode).toBe(201);
  });
});

// #129, user story 25: a past Workout counts from its own day. The clock is a Thursday noon in UTC, the test users'
// timezone, so the days before it fall in this week or last week whatever day the tests run. Only Date is faked
describe("a past Workout in the plan", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-05T12:00:00Z"), shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // Hours back from Thursday noon to a Workout at 10 am that day
  const YESTERDAY = DAY_HOURS + 2;
  const MONDAY = 3 * DAY_HOURS + 2;
  const LAST_SATURDAY = 5 * DAY_HOURS + 2;
  const legDay = (startedHoursAgo: number) =>
    workout(startedHoursAgo, [
      { slug: "goblet-squat", sets: Array.from({ length: 5 }, () => lifted(14, 10)) },
      { slug: "bulgarian-split-squat", sets: Array.from({ length: 5 }, () => lifted(12, 10)) },
    ]);

  // The Assessment Workouts fall on Tuesday and Wednesday, so with 3 days a week a third Workout this week is the
  // week's work done
  it("lands in the week it was done, and rebuilds the Planned Workout", async () => {
    const thisWeek = await assessedUser();
    const lastWeek = await assessedUser();

    expect((await thisWeek.user.post("/workouts", legDay(MONDAY))).statusCode).toBe(201);
    expect((await lastWeek.user.post("/workouts", legDay(LAST_SATURDAY))).statusCode).toBe(201);

    const rebuilt = await currentPlan(thisWeek.user);
    expect(rebuilt.id).not.toBe(thisWeek.plan.id);
    expect(rebuilt.weekStart).toBe("2026-11-02");
    expect(rebuilt.reasons).toContainEqual({ code: "budget-met" });
    expect((await currentPlan(lastWeek.user)).reasons).not.toContainEqual({ code: "budget-met" });
  });

  // Fatigue fades over 48 hours from the Workout's own day, though its Sets were logged an hour ago
  it("tires its Muscles from the day it was done", async () => {
    const yesterday = await assessedUser();
    const monday = await assessedUser();

    await yesterday.user.post("/workouts", legDay(YESTERDAY));
    await monday.user.post("/workouts", legDay(MONDAY));

    expect((await currentPlan(yesterday.user)).reasons).toContainEqual(
      expect.objectContaining({
        code: "recovering",
        muscles: expect.arrayContaining(["quads"]),
        lastSetOn: "2026-11-04",
      }),
    );
    expect((await currentPlan(monday.user)).reasons).not.toContainEqual(
      expect.objectContaining({ code: "recovering" }),
    );
  });
});

// A user whose pair of Assessment Workouts is uploaded, with the Planned Workout the Coach built from it
async function assessedUser() {
  const user = await api.signIn();
  for (const assessmentWorkout of assessmentPair()) await user.post("/workouts", assessmentWorkout);
  return { user, plan: await currentPlan(user) };
}

async function currentPlan(user: TestUser) {
  const { statusCode, body } = await user.post("/planned-workouts/current");
  expect(statusCode).toBe(200);
  expect(body).not.toBeNull();
  return body as PlannedWorkout;
}
