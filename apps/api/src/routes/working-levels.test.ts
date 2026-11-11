import type { EquipmentProfileInput, LatestAssessment, PlannedWorkout, Set, WorkingLevel } from "@fit/shared";
import type { LegacyWorkingLevel } from "@fit/engines";
import { describe, expect, it } from "vitest";
import { type TestUser, useRouteTestApi } from "../test/route-test-api";
import { assessmentPair, held, repsDone, workout } from "../test/workouts";

const api = useRouteTestApi();

// A home gym with a barbell (20 kg bar, 2.5 and 5 kg plates, so 20, 25, 30, 35 kg...) and fixed dumbbells
const BARBELL_AND_DUMBBELLS: EquipmentProfileInput = {
  name: "Garage",
  location: "home",
  isPrimary: true,
  tags: ["barbell", "plates", "squat_rack", "dumbbells", "flat_bench"],
  loads: {
    barbell: { barKg: 20, platesKg: [2.5, 5] },
    dumbbells: { kind: "fixed", weightsKg: [8, 10, 12, 14, 16, 18, 20, 22, 24] },
  },
};

describe("Working Levels as a load and a target (#131)", () => {
  // Stories 27, 28: a weighted Working Level is a load the profile has and a target reps at the bottom of its range,
  // 8–12 by default and 6–10 for a barbell lift
  it("seeds each weighted Working Level at a load the profile has, at the bottom of its rep range", async () => {
    const user = await api.signIn({ equipmentProfile: BARBELL_AND_DUMBBELLS });
    await assess(user);

    // Goblet squat: a 14 kg x 5 at RPE 9 is a maximum of 16.8 kg, which lifts 12.6 kg for 8 reps with 2 in reserve;
    // the heaviest dumbbell at or below that is 12 kg. The back squat (2.5 x the goblet squat's maximum, 42 kg) lifts
    // 33.2 kg for 6 reps with 2 in reserve; the heaviest bar load at or below that is 30 kg
    const levels = await workingLevels(user);
    expect(levels.get("goblet-squat")).toMatchObject({ unit: "kg", kg: 12, reps: 8 });
    expect(levels.get("back-squat")).toMatchObject({ unit: "kg", kg: 30, reps: 6 });
  });

  // Story 27: the Planned Workout, which Today shows, prescribes each weighted Exercise its load × target reps
  it("prescribes each weighted Exercise its Working Level's load × target reps", async () => {
    const user = await api.signIn({ equipmentProfile: BARBELL_AND_DUMBBELLS });
    await assess(user);

    // The floor press test (12 kg x 5 at RPE 9) makes a bench press maximum of 38.9 kg: 30.7 kg for 6 reps with 2 in
    // reserve, so the 30 kg bar load. The dumbbell row stays in its 8–12 range
    const targets = new Map((await currentPlan(user)).plannedExercises.map(({ slug, target }) => [slug, target]));
    expect(targets.get("barbell-bench-press")).toEqual({ unit: "kg", kg: 30, reps: 6 });
    expect(targets.get("one-arm-dumbbell-row")).toEqual({ unit: "kg", kg: 14, reps: 8 });
  });

  // Story 53, spec #119 "The Working Level's new shape": bodyweight seeding caps at 15 reps, and a seed above 15 starts
  // on the harder variant
  it("starts a bodyweight Exercise seeded above 15 reps on its harder variant", async () => {
    const user = await api.signIn({ equipmentProfile: NO_EQUIPMENT });
    // 20 push-ups to failure: 18 with 2 in reserve, above 15. A decline push-up moves more of the body: 14
    await assessWith(user, [{ slug: "push-up", sets: [repsDone(20)] }]);

    const levels = await workingLevels(user);
    expect(levels.get("push-up")).toMatchObject({ unit: "reps", reps: 15, outgrown: true });
    expect(levels.get("decline-push-up")).toMatchObject({ unit: "reps", reps: 14, outgrown: false });
    const planned = (await currentPlan(user)).plannedExercises.map(({ slug }) => slug);
    expect(planned).toContain("decline-push-up");
    expect(planned).not.toContain("push-up");
  });
});

// Stories 83, 84: stored Working Levels from before #131 are converted once, at startup. No route stores the old
// shape, so the test writes it straight to the collection and runs the migration as startup does
describe("the Working Level migration (#131)", () => {
  it("moves each stored weighted level to the heaviest load at or below its kg, at the bottom of its range", async () => {
    const user = await api.signIn({ equipmentProfile: BARBELL_AND_DUMBBELLS });
    const [, b] = await assess(user);
    const plan = await currentPlan(user);

    await storeLegacyWorkingLevels(user, [
      // 13.9 kg for 8 reps: the 12 kg dumbbells, at 8 reps
      { slug: "one-arm-dumbbell-row", unit: "kg", kg: 13.9 },
      // 34 kg: the 30 kg bar load, at 6 reps
      { slug: "barbell-bench-press", unit: "kg", kg: 34 },
      // Lighter than the lightest dumbbell: kept as it is, to be rounded when prescribed
      { slug: "dumbbell-lateral-raise", unit: "kg", kg: 5.3 },
    ]);

    const levels = await workingLevels(user);
    const fromB = { movedBy: { workoutId: b.id, startedAt: b.startedAt }, misses: 0, outgrown: false };
    expect(levels.get("one-arm-dumbbell-row")).toEqual({
      slug: "one-arm-dumbbell-row",
      unit: "kg",
      kg: 12,
      reps: 8,
      ...fromB,
    });
    expect(levels.get("barbell-bench-press")).toEqual({
      slug: "barbell-bench-press",
      unit: "kg",
      kg: 30,
      reps: 6,
      ...fromB,
    });
    expect(levels.get("dumbbell-lateral-raise")).toMatchObject({ kg: 5.3, reps: 8 });
    // The plan built from the old levels is rebuilt from the converted ones
    const next = await currentPlan(user);
    expect(next.id).not.toBe(plan.id);
    const targets = new Map(next.plannedExercises.map(({ slug, target }) => [slug, target]));
    expect(targets.get("one-arm-dumbbell-row")).toEqual({ unit: "kg", kg: 12, reps: 8 });
  });

  it("clamps reps levels into the new ranges: band reps into 10–15, bodyweight reps to 15 and outgrown above it", async () => {
    const user = await api.signIn({ equipmentProfile: NO_EQUIPMENT });
    await assessWith(user, [{ slug: "push-up", sets: [repsDone(12)] }]);

    await storeLegacyWorkingLevels(user, [
      { slug: "band-row", unit: "band", level: "medium", reps: 8 },
      { slug: "band-pull-apart", unit: "band", level: "light", reps: 20 },
      { slug: "push-up", unit: "reps", reps: 20 },
      { slug: "bodyweight-squat", unit: "reps", reps: 12 },
      { slug: "plank", unit: "seconds", seconds: 75 },
    ]);

    const levels = await workingLevels(user);
    expect(levels.get("band-row")).toMatchObject({ level: "medium", reps: 10 });
    expect(levels.get("band-pull-apart")).toMatchObject({ level: "light", reps: 15 });
    expect(levels.get("push-up")).toMatchObject({ reps: 15, outgrown: true });
    expect(levels.get("bodyweight-squat")).toMatchObject({ reps: 12, outgrown: false });
    expect(levels.get("plank")).toMatchObject({ seconds: 75, misses: 0 });
  });

  it("leaves levels already in the new shape as they are", async () => {
    const user = await api.signIn({ equipmentProfile: BARBELL_AND_DUMBBELLS });
    await assess(user);
    const before = await workingLevels(user);

    await storeLegacyWorkingLevels(user, []);

    expect(await workingLevels(user)).toEqual(before);
  });
});

// Replaces the user's stored Working Levels with these in the shape stored before #131, then runs the migration.
// Imported here, not at the top, as the database client reads MONGODB_URI when it loads
async function storeLegacyWorkingLevels(user: TestUser, legacy: LegacyWorkingLevel[]) {
  const { workingLevels, migrateWorkingLevels } = await import("../assessments");
  const assessmentId = (await workingLevels.findOne({ clerkUserId: user.id }))?.assessmentId;
  const slugs = legacy.map(({ slug }) => slug);
  await workingLevels.deleteMany({ clerkUserId: user.id, slug: { $in: slugs } });
  if (legacy.length) {
    await workingLevels.insertMany(legacy.map((level) => ({ ...level, clerkUserId: user.id, assessmentId }) as never));
  }
  await migrateWorkingLevels();
}

const NO_EQUIPMENT: EquipmentProfileInput = {
  name: "Anywhere",
  location: "home",
  isPrimary: true,
  tags: [],
  loads: {},
};

// A bodyweight user's pair of Assessment Workouts, B testing push and pull with these
async function assessWith(user: TestUser, push: { slug: string; sets: Set[] }[]) {
  const a = workout(
    50,
    [
      { slug: "bodyweight-squat", sets: [repsDone(25)] },
      { slug: "single-leg-glute-bridge", sets: [repsDone(15)] },
      { slug: "plank", sets: [held(60)] },
    ],
    { assessment: "A" },
  );
  const b = workout(26, [...push, { slug: "inverted-row", sets: [repsDone(12)] }], { assessment: "B" });
  for (const assessmentWorkout of [a, b]) {
    expect((await user.post("/workouts", assessmentWorkout)).statusCode).toBe(201);
  }
}

// The user's pair of Assessment Workouts, uploaded
async function assess(user: TestUser) {
  const pair = assessmentPair();
  for (const assessmentWorkout of pair) {
    expect((await user.post("/workouts", assessmentWorkout)).statusCode).toBe(201);
  }
  return pair;
}

async function workingLevels(user: TestUser) {
  const latest = (await user.get("/assessments/latest")).body as LatestAssessment;
  return new Map<string, WorkingLevel>(latest!.workingLevels.map((level) => [level.slug, level]));
}

async function currentPlan(user: TestUser) {
  const { body } = await user.post("/planned-workouts/current");
  return body as PlannedWorkout;
}
