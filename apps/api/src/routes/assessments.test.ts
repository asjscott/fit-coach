import type { LatestAssessment, PlannedWorkout } from "@fit/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type TestUser, useRouteTestApi } from "../test/route-test-api";
import { at, upload } from "../test/uploads";
import { assessmentPair, lifted } from "../test/workouts";

const api = useRouteTestApi();

// The first Assessment is in the week of Monday 9 November 2026, so its deload week is that of Monday 7 December
const ASSESSED = "2026-11-11T15:00:00Z";
const WEEK_2 = "2026-11-18T15:00:00Z";
const DELOAD_WEEK = "2026-12-09T15:00:00Z";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(ASSESSED), shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("pairing Assessment Workouts (#185)", () => {
  it("stores the A and B in the order they started, and when the B did, whichever uploads first", async () => {
    const user = await api.signIn();
    const [a, b] = assessmentPair();
    await upload(user, b);
    expect(await latestAssessment(user)).toBeNull();
    await upload(user, a);

    expect((await latestAssessment(user))?.assessment).toMatchObject({
      workoutIds: [a.id, b.id],
      lastStartedAt: b.startedAt,
    });
  });

  it("makes one Assessment however many uploads race to complete the pair", async () => {
    const user = await api.signIn();
    const [a, b] = assessmentPair();
    const racing = await Promise.all([a, b, b, a, b].map((finished) => user.post("/workouts", finished)));
    expect(racing.every(({ statusCode }) => statusCode === 200 || statusCode === 201)).toBe(true);
    const first = await latestAssessment(user);
    expect(first?.assessment.workoutIds).toEqual([a.id, b.id]);

    for (const finished of [a, b]) expect((await user.post("/workouts", finished)).statusCode).toBe(200);

    expect(await latestAssessment(user)).toEqual(first);
  });
});

describe("migrating Assessments stored before #185", () => {
  it("keeps the results, Working Levels and plan, however often it runs, and takes no Workout twice", async () => {
    const user = await api.signIn();
    const [a, b] = assessmentPair();
    await upload(user, a);
    await upload(user, b);
    vi.setSystemTime(new Date(DELOAD_WEEK));
    const [a2, b2] = assessmentPair();
    await upload(user, a2);
    await upload(user, b2);
    const latest = await latestAssessment(user);
    expect(latest?.assessment.workoutIds).toEqual([a2.id, b2.id]);
    const plan = (await user.post("/planned-workouts/current")).body as PlannedWorkout;

    await storeAsBefore185();
    for (let run = 1; run <= 2; run++) {
      await startUp();
      expect(await latestAssessment(user)).toEqual(latest);
      expect((await user.post("/planned-workouts/current")).body).toEqual(plan);
    }

    for (const finished of [a, b, a2, b2]) expect((await user.post("/workouts", finished)).statusCode).toBe(200);
    expect(await latestAssessment(user)).toEqual(latest);
  });

  it("still gives the deload week, and a retake that keeps the Block's progress", async () => {
    const user = await api.signIn();
    const [a, b] = assessmentPair();
    await upload(user, a);
    await upload(user, b);
    await storeAsBefore185();
    await startUp();

    vi.setSystemTime(new Date(WEEK_2));
    const slug = "dumbbell-lateral-raise";
    const seeded = levelOf(await latestAssessment(user), slug);
    if (seeded?.unit !== "kg") throw new Error("The lateral raise has no load");
    await upload(user, at(3, [{ slug, sets: [lifted(seeded.kg, seeded.reps), lifted(seeded.kg, seeded.reps)] }]));
    const progressed = levelOf(await latestAssessment(user), slug);
    expect(progressed).toMatchObject({ reps: seeded.reps + 1 });

    vi.setSystemTime(new Date(DELOAD_WEEK));
    // The deload week moves nothing
    await upload(user, at(3, [{ slug, sets: [lifted(seeded.kg, 12), lifted(seeded.kg, 12)] }]));
    expect(levelOf(await latestAssessment(user), slug)).toEqual(progressed);

    const [a2, b2] = assessmentPair();
    await upload(user, a2);
    await upload(user, b2);
    const retaken = await latestAssessment(user);
    expect(retaken?.assessment).toMatchObject({ workoutIds: [a2.id, b2.id], lastStartedAt: b2.startedAt });
    expect(levelOf(retaken, slug)).toEqual(progressed);
    expect(levelOf(retaken, "goblet-squat")).toMatchObject({ movedBy: { workoutId: b2.id } });
  });
});

const levelOf = (latest: LatestAssessment, slug: string) => latest?.workingLevels.find((level) => level.slug === slug);

async function latestAssessment(user: TestUser) {
  return (await user.get("/assessments/latest")).body as LatestAssessment;
}

// Puts every stored Assessment, and the collection's indexes, back as they were before #185. Imported here, not at the
// top, as the database client reads MONGODB_URI when it loads
async function storeAsBefore185() {
  const { assessments } = await import("../assessments");
  await assessments.dropIndexes();
  await assessments.updateMany({ workoutIds: { $exists: true } }, [
    {
      $set: {
        aWorkoutId: { $arrayElemAt: ["$workoutIds", 0] },
        bWorkoutId: { $arrayElemAt: ["$workoutIds", 1] },
        bStartedAt: "$lastStartedAt",
      },
    },
    { $unset: ["workoutIds", "lastStartedAt"] },
  ]);
  await assessments.createIndex({ clerkUserId: 1, bStartedAt: -1 });
  await assessments.createIndex({ clerkUserId: 1, aWorkoutId: 1 }, { unique: true });
  await assessments.createIndex({ clerkUserId: 1, bWorkoutId: 1 }, { unique: true });
}

// A deploy's start, which migrates
async function startUp() {
  const { buildApp } = await import("../app");
  const app = await buildApp({
    logger: false,
    foodSources: { search: async () => ({ generic: [], branded: [] }), byBarcode: async () => null },
    failOnSetupError: true,
  });
  await app.close();
}
