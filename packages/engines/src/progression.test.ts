import type { Set, WorkingLevel } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { exerciseBySlug } from "./data/exercises";
import type { ProfileWithLoads } from "./equipment";
import { progressWorkingLevel, type ProgressionInput } from "./progression";

// Fixed dumbbells at home: 8 to 24 kg in 2 kg steps
const DUMBBELLS: ProfileWithLoads = {
  tags: ["dumbbells"],
  loads: { dumbbells: { kind: "fixed", weightsKg: [8, 10, 12, 14, 16, 18, 20, 22, 24] } },
};

const LAST_MOVER = { workoutId: "00000000-0000-4000-8000-000000000001", startedAt: "2026-11-02T18:00:00.000Z" };
const THIS_WORKOUT = { id: "00000000-0000-4000-8000-000000000002", startedAt: "2026-11-04T18:00:00.000Z" };

const lifted = (kg: number, reps: number, rpe?: number): Set => ({
  kind: "external",
  kg,
  reps,
  ...(rpe && { rpe }),
  loggedAt: "2026-11-04T18:10:00.000Z",
});

// A goblet squat (8–12 reps) Working Level, last moved by the Workout before this one
const gobletSquat = (kg: number, reps: number, extra: Partial<WorkingLevel> = {}): WorkingLevel =>
  ({
    slug: "goblet-squat",
    unit: "kg",
    kg,
    reps,
    movedBy: LAST_MOVER,
    misses: 0,
    outgrown: false,
    ...extra,
  }) as WorkingLevel;

function progress(level: WorkingLevel, sets: Set[], extra: Partial<ProgressionInput> = {}) {
  return progressWorkingLevel({
    level,
    workout: THIS_WORKOUT,
    workoutExercise: { slug: level.slug, sets },
    exercise: exerciseBySlug(level.slug)!,
    equipmentProfile: DUMBBELLS,
    deloadWeek: false,
    ...extra,
  });
}

const movedByThisWorkout = { workoutId: THIS_WORKOUT.id, startedAt: THIS_WORKOUT.startedAt };

// Stories 29–39, ADR 0007: double progression of a weighted Exercise from the Sets just logged
describe("progressWorkingLevel: double progression", () => {
  // Story 29
  it("puts the target up 1 rep when every Set reaches it", () => {
    expect(progress(gobletSquat(14, 9), [lifted(14, 9), lifted(14, 10), lifted(14, 9)])).toEqual({
      level: gobletSquat(14, 10, { movedBy: movedByThisWorkout, change: { code: "target-up" } }),
      change: { code: "target-up" },
    });
  });

  it("leaves the load and target as they are when a Set falls short of the target, recording the Workout", () => {
    expect(progress(gobletSquat(14, 10), [lifted(14, 10), lifted(14, 9)])).toEqual({
      level: gobletSquat(14, 10, { movedBy: movedByThisWorkout }),
      change: null,
    });
  });

  it("drops the reason an earlier Workout gave once a Workout changes nothing", () => {
    const level = gobletSquat(14, 10, { change: { code: "target-up" } });
    expect(progress(level, [lifted(14, 10), lifted(14, 9)])?.level).not.toHaveProperty("change");
  });

  // Stories 30–32: one Load Step up, to the reps Epley predicts there, once that's at least the bottom of the range
  it("puts the load up one Load Step when every Set reaches the top of the range, at the reps Epley predicts", () => {
    // 20 kg × 12 is a maximum of 28 kg, which lifts the 22 kg dumbbells 8.2 times: 8, the bottom of 8–12
    expect(progress(gobletSquat(20, 12), [lifted(20, 12), lifted(20, 12), lifted(20, 13)])).toEqual({
      level: gobletSquat(22, 8, { movedBy: movedByThisWorkout, change: { code: "load-up" } }),
      change: { code: "load-up" },
    });
  });

  // Story 33
  it("keeps the reps climbing towards 20 while Epley predicts fewer than the bottom of the range a Load Step up", () => {
    // 14 kg × 12 is a maximum of 19.6 kg, which lifts the 16 kg dumbbells only 6.75 times
    expect(progress(gobletSquat(14, 12), [lifted(14, 12), lifted(14, 12)])).toMatchObject({
      level: { kg: 14, reps: 13 },
      change: { code: "target-up" },
    });
  });

  it("never sets a target past the top of the range after a Load Step", () => {
    // 14 kg × 19 is a maximum of 22.9 kg, which lifts 16 kg 13 times: the target stays at the top, 12
    expect(progress(gobletSquat(14, 19), [lifted(14, 19), lifted(14, 19)])).toMatchObject({
      level: { kg: 16, reps: 12 },
      change: { code: "load-up" },
    });
  });

  // Stories 34, 35: the load ceiling
  it("climbs to 20 reps at the heaviest load the profile has", () => {
    expect(progress(gobletSquat(24, 12), [lifted(24, 12), lifted(24, 12)])).toMatchObject({
      level: { kg: 24, reps: 13, outgrown: false },
      change: { code: "target-up" },
    });
    expect(progress(gobletSquat(24, 19), [lifted(24, 19), lifted(24, 20)])).toMatchObject({
      level: { kg: 24, reps: 20, outgrown: false },
    });
  });

  it("outgrows the Exercise at 20 reps on every Set at the heaviest load, for the harder variant or a hold", () => {
    expect(progress(gobletSquat(24, 20), [lifted(24, 20), lifted(24, 21)])).toEqual({
      level: gobletSquat(24, 20, { movedBy: movedByThisWorkout, outgrown: true, change: { code: "outgrown" } }),
      change: { code: "outgrown" },
    });
  });

  it("treats a profile that lists no loads as a load ceiling", () => {
    const noLoads: ProfileWithLoads = { tags: ["dumbbells"], loads: {} };
    expect(
      progress(gobletSquat(14, 12), [lifted(14, 12), lifted(14, 12)], { equipmentProfile: noLoads }),
    ).toMatchObject({ level: { kg: 14, reps: 13 } });
  });
});

// Stories 36–41, spec #119 "Which Sets it judges" and "At upload"
describe("progressWorkingLevel: the Sets it judges", () => {
  // Story 36
  it("judges the Sets at the lowest load used", () => {
    // The 16 kg Set fell short of 11, but the two at 14 kg reached it
    expect(progress(gobletSquat(14, 11), [lifted(16, 8), lifted(14, 12), lifted(14, 11)])).toMatchObject({
      level: { kg: 14, reps: 12 },
      change: { code: "target-up" },
    });
  });

  // Story 37
  it.each([
    ["heavier", [lifted(16, 9), lifted(16, 10)], { kg: 16, reps: 9 }],
    ["lighter", [lifted(12, 12), lifted(12, 13)], { kg: 12, reps: 12 }],
  ])("makes a %s load than the one prescribed the new base, at the fewest reps lifted", (_, sets, level) => {
    expect(progress(gobletSquat(14, 10), sets)).toMatchObject({ level, change: { code: "new-base" } });
  });

  it("judges a level lighter than any load against the load it was prescribed at", () => {
    // 7 kg is prescribed as the 8 kg dumbbells, the nearest the profile has
    expect(progress(gobletSquat(7, 8), [lifted(8, 8), lifted(8, 8)])).toMatchObject({
      level: { kg: 8, reps: 9 },
      change: { code: "target-up" },
    });
  });

  // Story 38
  it("moves nothing on fewer than 2 Sets at the lowest load", () => {
    expect(progress(gobletSquat(14, 9), [lifted(14, 12)])).toBeNull();
    expect(progress(gobletSquat(14, 9), [lifted(16, 12), lifted(14, 12)])).toBeNull();
  });

  // Story 39
  it("judges an Exercise done as one Set on that Set", () => {
    expect(progress(gobletSquat(14, 9), [lifted(14, 9)], { plannedSets: 1 })).toMatchObject({
      level: { kg: 14, reps: 10 },
    });
  });

  // Story 40
  it("leaves levels to an Assessment Workout, which sets them", () => {
    const assessment = { ...THIS_WORKOUT, assessment: "B" as const };
    expect(progress(gobletSquat(14, 9), [lifted(14, 9), lifted(14, 9)], { workout: assessment })).toBeNull();
  });

  // Stories 26, 82
  it.each([
    ["the Workout that last moved it, uploaded again", LAST_MOVER.startedAt],
    ["a Workout that started before the one that last moved it", "2026-11-01T18:00:00.000Z"],
  ])("never moves a level by %s", (_, startedAt) => {
    const workout = { id: LAST_MOVER.workoutId, startedAt };
    expect(progress(gobletSquat(14, 9), [lifted(14, 9), lifted(14, 9)], { workout })).toBeNull();
  });

  it("moves a level no Workout has moved yet", () => {
    expect(progress(gobletSquat(14, 9, { movedBy: null }), [lifted(14, 9), lifted(14, 9)])).not.toBeNull();
  });
});

// Spec #119: the other kinds of Exercise get their rules from #133–#136; until then they stay where they are
describe("progressWorkingLevel: Exercises without double progression yet", () => {
  const level = (slug: string, shape: object) =>
    ({ slug, movedBy: LAST_MOVER, misses: 0, outgrown: false, ...shape }) as WorkingLevel;
  const repsDone = (reps: number): Set => ({ kind: "bodyweight", reps, loggedAt: THIS_WORKOUT.startedAt });
  const held = (seconds: number): Set => ({ kind: "timed", seconds, loggedAt: THIS_WORKOUT.startedAt });

  it.each([
    ["a bodyweight Exercise", level("push-up", { unit: "reps", reps: 10 }), [repsDone(12), repsDone(12)]],
    ["a timed Exercise", level("plank", { unit: "seconds", seconds: 30 }), [held(40), held(40)]],
    ["a band Exercise", level("band-row", { unit: "band", level: "light", reps: 10 }), [repsDone(15), repsDone(15)]],
    [
      "a weighted Ballistic Exercise",
      level("kettlebell-swing", { unit: "kg", kg: 16, reps: 8 }),
      [lifted(16, 8), lifted(16, 8)],
    ],
    ["a carry", level("farmers-carry", { unit: "kg", kg: 20, reps: 8 }), [lifted(24, 8), lifted(24, 8)]],
  ])("leaves %s unmoved", (_, workingLevel, sets) => {
    expect(progress(workingLevel, sets)).toBeNull();
  });
});

// Stories 46–52, ADR 0007: a Miss is Sets averaging more than 2 reps short of target, or 10 seconds for a timed
// Exercise; two in a row bring the Exercise down
describe("progressWorkingLevel: Misses", () => {
  // Story 46
  it("counts a Miss when the Sets average more than 2 reps short of the target, holding the level", () => {
    // 7 and 7 average 7, 3 short of 10
    expect(progress(gobletSquat(14, 10), [lifted(14, 7), lifted(14, 7)])).toEqual({
      level: gobletSquat(14, 10, { movedBy: movedByThisWorkout, misses: 1 }),
      change: null,
    });
  });

  // Story 46: a bad Set or two doesn't count
  it("doesn't count Sets averaging 2 reps short as a Miss", () => {
    // 10, 7 and 7 average 8
    expect(progress(gobletSquat(14, 10), [lifted(14, 10), lifted(14, 7), lifted(14, 7)])).toMatchObject({
      level: { kg: 14, reps: 10, misses: 0 },
    });
  });

  it("ends a run of Misses on a Workout that isn't one", () => {
    expect(progress(gobletSquat(14, 10, { misses: 1 }), [lifted(14, 9), lifted(14, 8)])).toMatchObject({
      level: { kg: 14, reps: 10, misses: 0 },
    });
    expect(progress(gobletSquat(14, 10, { misses: 1 }), [lifted(14, 10), lifted(14, 10)])).toMatchObject({
      level: { kg: 14, reps: 11, misses: 0 },
    });
  });

  // Story 47
  it("drops a weighted Exercise one Load Step on the second Miss in a row, back to the bottom of the range", () => {
    // 20 kg down to 18 kg is 10% lighter
    expect(progress(gobletSquat(20, 11, { misses: 1 }), [lifted(20, 8), lifted(20, 7)])).toEqual({
      level: gobletSquat(18, 8, { movedBy: movedByThisWorkout, misses: 0, change: { code: "load-down" } }),
      change: { code: "load-down" },
    });
  });

  // Story 48: on light dumbbells one step down can be a quarter of the load
  it("keeps the load and drops the target 2 reps when one Load Step down is more than about 12% lighter", () => {
    // 10 kg down to 8 kg is 20% lighter
    expect(progress(gobletSquat(10, 11, { misses: 1 }), [lifted(10, 8), lifted(10, 7)])).toEqual({
      level: gobletSquat(10, 9, { movedBy: movedByThisWorkout, misses: 0, change: { code: "target-down" } }),
      change: { code: "target-down" },
    });
  });

  it("drops the target 2 reps at the lightest load the profile has", () => {
    expect(progress(gobletSquat(8, 12, { misses: 1 }), [lifted(8, 9), lifted(8, 9)])).toMatchObject({
      level: { kg: 8, reps: 10, misses: 0 },
      change: { code: "target-down" },
    });
  });

  it("counts a lighter load than the one prescribed as a new base, not a Miss", () => {
    expect(progress(gobletSquat(14, 11, { misses: 1 }), [lifted(12, 7), lifted(12, 7)])).toMatchObject({
      level: { kg: 12, reps: 7, misses: 0 },
      change: { code: "new-base" },
    });
  });

  // Story 49, 50: lower the target, never an easier variant
  const level = (slug: string, shape: object) =>
    ({ slug, movedBy: LAST_MOVER, misses: 0, outgrown: false, ...shape }) as WorkingLevel;
  const repsDone = (reps: number): Set => ({ kind: "bodyweight", reps, loggedAt: THIS_WORKOUT.startedAt });
  const held = (seconds: number): Set => ({ kind: "timed", seconds, loggedAt: THIS_WORKOUT.startedAt });

  it.each([
    [
      "a bodyweight target 2 reps",
      level("push-up", { unit: "reps", reps: 12, misses: 1 }),
      [repsDone(9), repsDone(8)],
      { unit: "reps", reps: 10 },
    ],
    [
      "a timed target 10 seconds",
      level("plank", { unit: "seconds", seconds: 45, misses: 1 }),
      [held(30), held(32)],
      { unit: "seconds", seconds: 35 },
    ],
    [
      "a band target 2 reps on the same band",
      level("band-row", { unit: "band", level: "medium", reps: 12, misses: 1 }),
      [repsDone(9), repsDone(8)],
      { unit: "band", level: "medium", reps: 10 },
    ],
  ])("lowers %s on the second Miss in a row", (_, workingLevel, sets, next) => {
    expect(progress(workingLevel, sets)).toEqual({
      level: { ...workingLevel, ...next, movedBy: movedByThisWorkout, misses: 0, change: { code: "target-down" } },
      change: { code: "target-down" },
    });
  });

  it("counts a timed Miss at more than 10 seconds short", () => {
    const plank = level("plank", { unit: "seconds", seconds: 45 });
    expect(progress(plank, [held(34), held(34)])).toMatchObject({ level: { seconds: 45, misses: 1 } });
    // 35 seconds is 10 short: no Miss, and the level waits on #135's ladders
    expect(progress(plank, [held(35), held(35)])?.level.misses ?? 0).toBe(0);
  });

  it("never brings a jump down", () => {
    const jump = level("box-jump", { unit: "reps", reps: 8, misses: 1 });
    expect(progress(jump, [repsDone(3), repsDone(3)])).toBeNull();
  });

  // Stories 38, 40
  it.each([
    ["on one Set", [lifted(14, 3)], {}],
    [
      "in an Assessment Workout",
      [lifted(14, 3), lifted(14, 3)],
      { workout: { ...THIS_WORKOUT, assessment: "A" as const } },
    ],
  ])("counts no Miss %s", (_, sets, extra) => {
    expect(progress(gobletSquat(14, 10, { misses: 1 }), sets, extra)).toBeNull();
  });
});
