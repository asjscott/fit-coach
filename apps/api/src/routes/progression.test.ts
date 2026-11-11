import type { LatestAssessment, PlannedWorkout, Set, WorkingLevel, Workout } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { type TestUser, useRouteTestApi } from "../test/route-test-api";
import { assessmentPair, hoursAgo, lifted, workout } from "../test/workouts";

const api = useRouteTestApi();

// Double progression at upload (#132, ADR 0007). The user is the harness's dumbbells-at-home user (8–24 kg in 2 kg
// steps), whose Assessment seeds the goblet squat at 12 kg × 8 and the one-arm row at 14 kg × 8 (8–12 reps)
describe("double progression at upload (#132)", () => {
  // Stories 29, 42, 81: the target goes up 1 rep, and the next plan prescribes it with the reason
  it("puts the target up 1 rep when every Set reaches it, for the next Planned Workout", async () => {
    const user = await assessedUser();
    const row = { slug: "one-arm-dumbbell-row", sets: [lifted(14, 8), lifted(14, 9), lifted(14, 8)] };
    await upload(user, at(100, [row]));

    expect((await workingLevels(user)).get(row.slug)).toMatchObject({ kg: 14, reps: 9 });
    expect(await plannedExercise(user, row.slug)).toMatchObject({
      target: { unit: "kg", kg: 14, reps: 9 },
      change: { code: "target-up" },
    });
  });

  // Stories 30–32, 37: a different load becomes the new base, then the top of the range takes one Load Step, to the
  // reps Epley predicts there
  it("steps the load up from the top of the range to the reps Epley predicts there", async () => {
    const user = await assessedUser();
    const slug = "one-arm-dumbbell-row";
    // Last week or before, so the row's Workouts this week leave it within the variety cap
    await upload(user, at(200, [{ slug, sets: [lifted(20, 12), lifted(20, 13)] }]));
    expect((await workingLevels(user)).get(slug)).toMatchObject({ kg: 20, reps: 12, change: { code: "new-base" } });

    // 20 kg × 12 is a maximum of 28 kg, which lifts the 22 kg dumbbells 8 times
    await upload(user, at(75, [{ slug, sets: [lifted(20, 12), lifted(20, 12)] }]));
    expect((await workingLevels(user)).get(slug)).toMatchObject({ kg: 22, reps: 8 });
    expect(await plannedExercise(user, slug)).toMatchObject({
      target: { unit: "kg", kg: 22, reps: 8 },
      change: { code: "load-up" },
    });
  });

  // Story 33: a Load Step Epley says is out of reach keeps the reps climbing
  it("keeps the reps climbing while the next Load Step is out of reach", async () => {
    const user = await assessedUser();
    // A new base of 14 kg × 12, then the top of the range there
    await upload(user, at(100, [{ slug: "goblet-squat", sets: [lifted(14, 12), lifted(14, 12)] }]));
    await upload(user, at(75, [{ slug: "goblet-squat", sets: [lifted(14, 12), lifted(14, 12)] }]));

    // 14 kg × 12 is a maximum of 19.6 kg, which lifts 16 kg only 6.75 times
    expect((await workingLevels(user)).get("goblet-squat")).toMatchObject({ kg: 14, reps: 13 });
  });

  // Story 36
  it("judges the Sets at the lowest load used", async () => {
    const user = await assessedUser();
    const sets = [lifted(14, 6), lifted(12, 8), lifted(12, 8)];
    await upload(user, at(100, [{ slug: "goblet-squat", sets }]));

    expect((await workingLevels(user)).get("goblet-squat")).toMatchObject({ kg: 12, reps: 9 });
  });

  // Story 38
  it("moves nothing on one Set", async () => {
    const user = await assessedUser();
    const before = (await workingLevels(user)).get("goblet-squat");
    await upload(user, at(100, [{ slug: "goblet-squat", sets: [lifted(12, 12)] }]));

    expect((await workingLevels(user)).get("goblet-squat")).toEqual(before);
  });

  // Story 41: each Exercise moves only from its own Sets, an Alternative Exercise included
  it("moves an Alternative Exercise's own Working Level, not the planned Exercise's", async () => {
    const user = await assessedUser();
    const plan = await currentPlan(user);
    const before = await workingLevels(user);
    const planned = plan.plannedExercises[0]!.slug;
    const alternative = before.get("dumbbell-romanian-deadlift") as Extract<WorkingLevel, { unit: "kg" }>;
    expect(planned).not.toBe(alternative.slug);
    const sets = [lifted(alternative.kg, alternative.reps), lifted(alternative.kg, alternative.reps)];
    await upload(user, at(100, [{ slug: alternative.slug, sets }], { plannedWorkoutId: plan.id }));

    const after = await workingLevels(user);
    expect(after.get(planned)).toEqual(before.get(planned));
    expect(after.get(alternative.slug)).toMatchObject({ kg: alternative.kg, reps: alternative.reps + 1 });
  });

  // Story 40
  it("doesn't progress from an Assessment Workout", async () => {
    const user = await assessedUser();
    const before = (await workingLevels(user)).get("goblet-squat");
    const retest = { slug: "goblet-squat", sets: [lifted(12, 9, 7), lifted(12, 9, 8)] };
    await upload(user, at(100, [retest], { assessment: "A" }));

    expect((await workingLevels(user)).get("goblet-squat")).toEqual(before);
  });
});

// Stories 26, 82: only a Workout that started after the one that last moved a level moves it
describe("uploads that never move a level twice or backwards (#132)", () => {
  const reachingNine = [lifted(12, 9), lifted(12, 9)];

  it("moves a level once however often the Workout is uploaded", async () => {
    const user = await assessedUser();
    const finished = at(100, [{ slug: "goblet-squat", sets: [lifted(12, 8), lifted(12, 8)] }]);
    await upload(user, finished);
    expect((await user.post("/workouts", finished)).statusCode).toBe(200);

    expect((await workingLevels(user)).get("goblet-squat")).toMatchObject({ reps: 9 });
  });

  it("leaves a level to a later Workout when an earlier, Pending Workout uploads after it", async () => {
    const user = await assessedUser();
    const earlier = at(100, [{ slug: "goblet-squat", sets: [lifted(12, 8), lifted(12, 8)] }]);
    const later = at(75, [{ slug: "goblet-squat", sets: reachingNine }]);
    await upload(user, later);
    // The later Workout put the target up to 9 from 8; the earlier one would put it up again
    await upload(user, earlier);

    expect((await workingLevels(user)).get("goblet-squat")).toMatchObject({
      reps: 9,
      movedBy: { workoutId: later.id, startedAt: later.startedAt },
    });
  });
});

// The dumbbells-at-home user, assessed two weeks ago so that Workouts uploaded after it can be in an earlier week and
// rested by now
async function assessedUser() {
  const user = await api.signIn();
  const [a, b] = assessmentPair();
  await upload(user, retimed(a, 340));
  await upload(user, retimed(b, 320));
  return user;
}

// A Workout started this many hours ago, its Sets logged in its hour
function at(
  startedHoursAgo: number,
  exercises: { slug: string; sets: Set[] }[],
  extra: Partial<Pick<Workout, "assessment" | "plannedWorkoutId">> = {},
) {
  return retimed(workout(startedHoursAgo, exercises, extra), startedHoursAgo);
}

function retimed(finished: Workout, startedHoursAgo: number): Workout {
  return {
    ...finished,
    startedAt: hoursAgo(startedHoursAgo),
    endedAt: hoursAgo(startedHoursAgo - 1),
    workoutExercises: finished.workoutExercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => ({ ...set, loggedAt: hoursAgo(startedHoursAgo - 0.5) })),
    })),
  };
}

async function upload(user: TestUser, finished: Workout) {
  expect((await user.post("/workouts", finished)).statusCode).toBe(201);
}

async function workingLevels(user: TestUser) {
  const latest = (await user.get("/assessments/latest")).body as LatestAssessment;
  return new Map<string, WorkingLevel>(latest!.workingLevels.map((level) => [level.slug, level]));
}

async function currentPlan(user: TestUser) {
  return (await user.post("/planned-workouts/current")).body as PlannedWorkout;
}

async function plannedExercise(user: TestUser, slug: string) {
  return (await currentPlan(user)).plannedExercises.find((exercise) => exercise.slug === slug);
}
