import { exerciseBySlug } from "@fit/engines";
import type { LatestAssessment, PlannedWorkout, Set } from "@fit/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type TestUser, useRouteTestApi } from "../test/route-test-api";
import { assessmentPair, held, hoursAgo, lifted, repsDone, workout } from "../test/workouts";

const api = useRouteTestApi();

describe("POST /workouts", () => {
  // Spec #2: a Pending Workout is retried until it uploads, so the phone-generated id makes the upload idempotent
  it("stores an upload once however often it's retried: 201, then 200 with the stored Workout", async () => {
    const user = await api.signIn();
    const finished = workout(2, [{ slug: "goblet-squat", sets: [lifted(14, 10), lifted(14, 9)] }]);

    const first = await user.post("/workouts", finished);
    const retry = await user.post("/workouts", finished);
    const again = await user.post("/workouts", finished);

    expect(first.statusCode).toBe(201);
    expect([retry.statusCode, again.statusCode]).toEqual([200, 200]);
    expect(retry.body).toEqual(first.body);
    expect((await user.get("/workouts")).body).toEqual([first.body]);
  });

  // Spec #29: the second of a pair of Assessment Workouts completes the Assessment, which sets the Working Levels the
  // Coach plans from
  it("sets Working Levels once a pair of Assessment Workouts is complete, and only then plans", async () => {
    const user = await api.signIn();
    const [a, b] = assessmentPair();

    expect((await user.post("/workouts", a)).statusCode).toBe(201);
    expect((await user.get("/assessments/latest")).body).toBeNull();
    expect((await user.post("/planned-workouts/current")).body).toBeNull();

    expect((await user.post("/workouts", b)).statusCode).toBe(201);
    const latest = (await user.get("/assessments/latest")).body as LatestAssessment;
    expect(latest?.assessment).toMatchObject({ workoutIds: [a.id, b.id] });
    expect(latest?.workingLevels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "goblet-squat", unit: "kg" }),
        expect.objectContaining({ slug: "dumbbell-floor-press", unit: "kg" }),
        expect.objectContaining({ slug: "plank", unit: "seconds" }),
      ]),
    );
    const plan = (await user.post("/planned-workouts/current")).body as PlannedWorkout | null;
    expect(plan?.plannedExercises.length).toBeGreaterThan(0);
  });

  // Spec #77, ADR 0003: the server rebuilds the Planned Workout after every upload, so the next plan counts the Workout
  it("rebuilds the Planned Workout after an upload, so the next plan counts it", async () => {
    const { user, plan } = await assessedUser();

    // A Manual Workout of everything the plan prescribed: the week's Sets for those Muscles are now done
    const trained = workout(
      2,
      plan.plannedExercises.map(({ slug }) => ({ slug, sets: setsOf(slug) })),
    );
    expect((await user.post("/workouts", trained)).statusCode).toBe(201);

    const next = await currentPlan(user);
    expect(next.id).not.toBe(plan.id);
    expect(next.plannedExercises).not.toEqual(plan.plannedExercises);
  });

  // #97: a Recovery Workout isn't training, so the plan, and its id, stay as they are. The route skips the rebuild; a
  // rebuild would give this same plan, so what's pinned is what the phone sees
  it("keeps the same Planned Workout, id and all, after a Recovery Workout", async () => {
    const { user, plan } = await assessedUser();

    const recovery = workout(2, [
      { slug: "walk", sets: [held(20 * 60)] },
      { slug: "cat-cow", sets: [held(45), held(45)] },
    ]);
    expect((await user.post("/workouts", recovery)).statusCode).toBe(201);

    expect(await currentPlan(user)).toEqual(plan);
  });

  // #152: a Workout lasts at most 6 hours
  it("refuses a Workout that lasts more than 6 hours", async () => {
    const user = await api.signIn();
    const sevenHours = { ...workout(8, [{ slug: "goblet-squat", sets: [lifted(14, 10)] }]), endedAt: hoursAgo(1) };

    const { statusCode } = await user.post("/workouts", sevenHours);

    expect(statusCode).toBe(400);
    expect((await user.get("/workouts")).body).toEqual([]);
  });
});

// #143: History's delete. The clock is a Thursday noon in UTC, the test users' timezone, so the Assessment Workouts fall
// on Tuesday and Wednesday and, with 3 days a week, a Workout this morning is the week's work done. Only Date is faked
describe("DELETE /workouts/:id", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-05T12:00:00Z"), shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rebuilds the Planned Workout without the deleted Workout: the week's work isn't done, and nothing recovers from it", async () => {
    const { user } = await assessedUser();
    const { plan: neverLogged } = await assessedUser();
    const thisMorning = workout(2, [
      { slug: "goblet-squat", sets: Array.from({ length: 5 }, () => lifted(14, 10)) },
      { slug: "plank", sets: [held(60), held(60), held(60)] },
    ]);
    expect((await user.post("/workouts", thisMorning)).statusCode).toBe(201);
    const withIt = await currentPlan(user);
    expect(withIt.reasons).toContainEqual({ code: "budget-met" });
    expect(withIt.reasons).toContainEqual(
      expect.objectContaining({
        code: "recovering",
        muscles: expect.arrayContaining(["quads"]),
        lastSetOn: "2026-11-05",
      }),
    );

    expect((await user.delete(`/workouts/${thisMorning.id}`)).statusCode).toBe(204);

    const without = await currentPlan(user);
    expect(without.reasons).not.toContainEqual({ code: "budget-met" });
    expect(without.reasons).not.toContainEqual(expect.objectContaining({ lastSetOn: "2026-11-05" }));
    // The same plan as a user who never logged it
    expect(without.plannedExercises).toEqual(neverLogged.plannedExercises);
    expect(without.reasons).toEqual(neverLogged.reasons);
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

// Three hard Sets of an Exercise in its Load Type
function setsOf(slug: string): Set[] {
  const loadType = exerciseBySlug(slug)!.loadType;
  const set = loadType === "external" ? lifted(12, 10) : loadType === "bodyweight" ? repsDone(10) : held(45);
  return [set, set, set];
}
