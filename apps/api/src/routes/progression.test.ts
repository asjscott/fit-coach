import type { WorkingLevel } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { useRouteTestApi } from "../test/route-test-api";
import { assessedUser, at, currentPlan, plannedExercise, upload, workingLevels } from "../test/uploads";
import { held, lifted } from "../test/workouts";

const api = useRouteTestApi();

// Double progression at upload (#132, ADR 0007). The user is the harness's dumbbells-at-home user (8–24 kg in 2 kg
// steps), whose Assessment seeds the goblet squat at 12 kg × 8 and the one-arm row at 14 kg × 8 (8–12 reps)
describe("double progression at upload (#132)", () => {
  // Stories 29, 42, 81: the target goes up 1 rep, and the next plan prescribes it with the reason
  it("puts the target up 1 rep when every Set reaches it, for the next Planned Workout", async () => {
    const user = await assessedUser(api);
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
    const user = await assessedUser(api);
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
    const user = await assessedUser(api);
    // A new base of 14 kg × 12, then the top of the range there
    await upload(user, at(100, [{ slug: "goblet-squat", sets: [lifted(14, 12), lifted(14, 12)] }]));
    await upload(user, at(75, [{ slug: "goblet-squat", sets: [lifted(14, 12), lifted(14, 12)] }]));

    // 14 kg × 12 is a maximum of 19.6 kg, which lifts 16 kg only 6.75 times
    expect((await workingLevels(user)).get("goblet-squat")).toMatchObject({ kg: 14, reps: 13 });
  });

  // Story 36
  it("judges the Sets at the lowest load used", async () => {
    const user = await assessedUser(api);
    const sets = [lifted(14, 6), lifted(12, 8), lifted(12, 8)];
    await upload(user, at(100, [{ slug: "goblet-squat", sets }]));

    expect((await workingLevels(user)).get("goblet-squat")).toMatchObject({ kg: 12, reps: 9 });
  });

  // Story 38
  it("moves nothing on one Set", async () => {
    const user = await assessedUser(api);
    const before = (await workingLevels(user)).get("goblet-squat");
    await upload(user, at(100, [{ slug: "goblet-squat", sets: [lifted(12, 12)] }]));

    expect((await workingLevels(user)).get("goblet-squat")).toEqual(before);
  });

  // Story 41: each Exercise moves only from its own Sets, an Alternative Exercise included
  it("moves an Alternative Exercise's own Working Level, not the planned Exercise's", async () => {
    const user = await assessedUser(api);
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
    const user = await assessedUser(api);
    const before = (await workingLevels(user)).get("goblet-squat");
    const retest = { slug: "goblet-squat", sets: [lifted(12, 9, 7), lifted(12, 9, 8)] };
    await upload(user, at(100, [retest], { assessment: "A" }));

    expect((await workingLevels(user)).get("goblet-squat")).toEqual(before);
  });
});

// Stories 43, 44: an optional RPE on the last Set, where 10 holds the load and the target (#133)
describe("RPE on the last Set at upload (#133)", () => {
  it("holds the load and the target when the last Set was RPE 10, for the next Planned Workout", async () => {
    const user = await assessedUser(api);
    // Every Set reached the row's 14 kg × 8, which would put the target up, but the last was all the user had
    const row = { slug: "one-arm-dumbbell-row", sets: [lifted(14, 8), lifted(14, 8), lifted(14, 8, 10)] };
    await upload(user, at(100, [row]));

    expect((await workingLevels(user)).get(row.slug)).toMatchObject({ kg: 14, reps: 8, change: { code: "rpe-10" } });
    expect(await plannedExercise(user, row.slug)).toMatchObject({
      target: { unit: "kg", kg: 14, reps: 8 },
      change: { code: "rpe-10" },
    });
  });

  // Stories 44, 47: even on the second Miss in a row, which still counts
  it("holds the load and the target on a second Miss in a row when the last Set was RPE 10", async () => {
    const user = await assessedUser(api);
    const slug = "one-arm-dumbbell-row";
    await upload(user, at(250, [{ slug, sets: [lifted(14, 5), lifted(14, 5)] }]));
    await upload(user, at(200, [{ slug, sets: [lifted(14, 5), lifted(14, 5, 10)] }]));

    expect((await workingLevels(user)).get(slug)).toMatchObject({
      kg: 14,
      reps: 8,
      misses: 2,
      change: { code: "rpe-10" },
    });
    expect(await plannedExercise(user, slug)).toMatchObject({
      target: { unit: "kg", kg: 14, reps: 8 },
      change: { code: "rpe-10" },
    });
  });

  it("progresses as usual when the last Set's RPE is short of 10", async () => {
    const user = await assessedUser(api);
    const row = { slug: "one-arm-dumbbell-row", sets: [lifted(14, 8), lifted(14, 8), lifted(14, 8, 9)] };
    await upload(user, at(100, [row]));

    expect((await workingLevels(user)).get(row.slug)).toMatchObject({ kg: 14, reps: 9 });
  });
});

// Stories 26, 82: only a Workout that started after the one that last moved a level moves it
describe("uploads that never move a level twice or backwards (#132)", () => {
  const reachingNine = [lifted(12, 9), lifted(12, 9)];

  it("moves a level once however often the Workout is uploaded", async () => {
    const user = await assessedUser(api);
    const finished = at(100, [{ slug: "goblet-squat", sets: [lifted(12, 8), lifted(12, 8)] }]);
    await upload(user, finished);
    expect((await user.post("/workouts", finished)).statusCode).toBe(200);

    expect((await workingLevels(user)).get("goblet-squat")).toMatchObject({ reps: 9 });
  });

  it("leaves a level to a later Workout when an earlier, Pending Workout uploads after it", async () => {
    const user = await assessedUser(api);
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

// Stories 46–52, ADR 0007: two Misses in a row bring an Exercise down
describe("Misses at upload (#134)", () => {
  // Story 47
  it("drops a weighted Exercise one Load Step to the bottom of the range on the second Miss in a row", async () => {
    const user = await assessedUser(api);
    const slug = "one-arm-dumbbell-row";
    // A new base of 20 kg × 10, then two Workouts averaging 7
    await upload(user, at(250, [{ slug, sets: [lifted(20, 10), lifted(20, 10)] }]));
    await upload(user, at(200, [{ slug, sets: [lifted(20, 7), lifted(20, 7)] }]));
    expect((await workingLevels(user)).get(slug)).toMatchObject({ kg: 20, reps: 10, misses: 1 });

    await upload(user, at(150, [{ slug, sets: [lifted(20, 8), lifted(20, 6)] }]));
    // 20 kg down to 18 kg is 10% lighter
    expect((await workingLevels(user)).get(slug)).toMatchObject({ kg: 18, reps: 8, misses: 0 });
    expect(await plannedExercise(user, slug)).toMatchObject({
      target: { unit: "kg", kg: 18, reps: 8 },
      change: { code: "load-down" },
    });
  });

  // Story 48, 51, 52: Manual Workouts count, and a Workout without the Exercise, or none at all, isn't a Miss
  it("keeps the load and drops the target 2 reps when the step down is too big, across Workouts without it", async () => {
    const user = await assessedUser(api);
    // The goblet squat is seeded at 12 kg × 8; 12 kg down to 10 kg would be 17% lighter
    await upload(user, at(250, [{ slug: "goblet-squat", sets: [lifted(12, 5), lifted(12, 5)] }]));
    await upload(user, at(200, [{ slug: "one-arm-dumbbell-row", sets: [lifted(14, 8), lifted(14, 8)] }]));
    await upload(user, at(100, [{ slug: "goblet-squat", sets: [lifted(12, 6), lifted(12, 5)] }]));

    expect((await workingLevels(user)).get("goblet-squat")).toMatchObject({
      kg: 12,
      reps: 6,
      misses: 0,
      change: { code: "target-down" },
    });
  });

  // Story 46
  it("ends the run on a Workout that isn't a Miss", async () => {
    const user = await assessedUser(api);
    await upload(user, at(250, [{ slug: "goblet-squat", sets: [lifted(12, 5), lifted(12, 5)] }]));
    await upload(user, at(200, [{ slug: "goblet-squat", sets: [lifted(12, 7), lifted(12, 7)] }]));
    await upload(user, at(100, [{ slug: "goblet-squat", sets: [lifted(12, 5), lifted(12, 5)] }]));

    expect((await workingLevels(user)).get("goblet-squat")).toMatchObject({ kg: 12, reps: 8, misses: 1 });
  });

  // Story 49
  it("lowers a timed target 10 seconds on the second Miss in a row", async () => {
    const user = await assessedUser(api);
    const plank = (await workingLevels(user)).get("plank") as Extract<WorkingLevel, { unit: "seconds" }>;
    const short = [held(plank.seconds - 15), held(plank.seconds - 15)];
    await upload(user, at(250, [{ slug: "plank", sets: short }]));
    await upload(user, at(200, [{ slug: "plank", sets: short }]));

    expect((await workingLevels(user)).get("plank")).toMatchObject({
      unit: "seconds",
      seconds: plank.seconds - 10,
      change: { code: "target-down" },
    });
  });

  // Story 40
  it("counts no Miss in an Assessment Workout", async () => {
    const user = await assessedUser(api);
    await upload(user, at(250, [{ slug: "goblet-squat", sets: [lifted(12, 5), lifted(12, 5)] }]));
    await upload(
      user,
      at(200, [{ slug: "goblet-squat", sets: [lifted(12, 5, 9), lifted(12, 5, 9)] }], { assessment: "A" }),
    );

    expect((await workingLevels(user)).get("goblet-squat")).toMatchObject({ kg: 12, reps: 8, misses: 1 });
  });
});
