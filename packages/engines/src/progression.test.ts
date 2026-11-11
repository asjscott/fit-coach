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

const level = (slug: string, shape: object) =>
  ({ slug, movedBy: LAST_MOVER, misses: 0, outgrown: false, ...shape }) as WorkingLevel;
const repsDone = (reps: number): Set => ({ kind: "bodyweight", reps, loggedAt: THIS_WORKOUT.startedAt });
const held = (seconds: number): Set => ({ kind: "timed", seconds, loggedAt: THIS_WORKOUT.startedAt });
// A band Exercise's Sets are logged without the band: it's the one its Working Level names (story 59)
const banded = (reps: number): Set => lifted(1, reps);

// Tube bands at home: light, medium and heavy
const TUBE_BANDS: ProfileWithLoads = {
  tags: ["tube_bands"],
  loads: { tube_bands: { levels: ["light", "medium", "heavy"] } },
};

// Stories 53–57, spec #119 "Ladders": bodyweight and timed targets climb, then the Exercise moves to its harder variant
describe("progressWorkingLevel: bodyweight and timed ladders", () => {
  const pushUps = (reps: number, extra: Partial<WorkingLevel> = {}) =>
    level("push-up", { unit: "reps", reps, ...extra });
  const plank = (seconds: number, extra: Partial<WorkingLevel> = {}) =>
    level("plank", { unit: "seconds", seconds, ...extra });

  // Story 53
  it("puts a bodyweight target up 1 rep when every Set reaches it", () => {
    expect(progress(pushUps(10), [repsDone(10), repsDone(12), repsDone(11)])).toEqual({
      level: pushUps(11, { movedBy: movedByThisWorkout, change: { code: "target-up" } }),
      change: { code: "target-up" },
    });
  });

  it("leaves a bodyweight target as it is when a Set falls short, recording the Workout", () => {
    expect(progress(pushUps(10), [repsDone(10), repsDone(9)])).toEqual({
      level: pushUps(10, { movedBy: movedByThisWorkout }),
      change: null,
    });
  });

  // Story 54
  it("puts a timed target up 5 seconds when every Set reaches it", () => {
    expect(progress(plank(30), [held(30), held(35)])).toEqual({
      level: plank(35, { movedBy: movedByThisWorkout, change: { code: "seconds-up" } }),
      change: { code: "seconds-up" },
    });
  });

  it("judges a seeded timed target by the whole seconds it was prescribed as", () => {
    // 37.4 seconds is prescribed as 37
    expect(progress(plank(37.4), [held(37), held(37)])).toMatchObject({ level: { seconds: 42 } });
    expect(progress(plank(37.4), [held(37), held(36)])).toMatchObject({ level: { seconds: 37.4 }, change: null });
  });

  it.each([
    ["15 reps", pushUps(14), [repsDone(14), repsDone(14)], { reps: 15 }],
    ["60 seconds, never past it", plank(58), [held(59), held(59)], { seconds: 60 }],
  ])("climbs to the top of the ladder, %s", (_, workingLevel, sets, next) => {
    expect(progress(workingLevel, sets)).toMatchObject({ level: { ...next, outgrown: false } });
  });

  // Story 55: the planner then gives the harder variant, seeded from Reference Strength (story 56), or holds
  it.each([
    ["15 reps", pushUps(14), [repsDone(15), repsDone(17)], pushUps(15)],
    ["60 seconds", plank(55), [held(60), held(62)], plank(60)],
  ])("outgrows the Exercise at %s on every Set, for its harder variant", (_, workingLevel, sets, top) => {
    expect(progress(workingLevel, sets)).toEqual({
      level: { ...top, movedBy: movedByThisWorkout, outgrown: true, change: { code: "outgrown" } },
      change: { code: "outgrown" },
    });
  });

  // Story 57: an easier variant done again keeps its level at the top, so the plan moves on again
  it("keeps an outgrown easier variant's level when it's done again", () => {
    expect(progress(pushUps(15, { outgrown: true }), [repsDone(15), repsDone(15)])).toMatchObject({
      level: { reps: 15, outgrown: true },
      change: { code: "outgrown" },
    });
  });
});

// Stories 58, 59, spec #119 "Ladders": a band Exercise climbs 10–15 reps, then steps to the next band
describe("progressWorkingLevel: band ladders", () => {
  const bandRow = (band: string, reps: number, extra: Partial<WorkingLevel> = {}) =>
    level("band-row", { unit: "band", level: band, reps, ...extra });
  const progressBand = (workingLevel: WorkingLevel, sets: Set[], equipmentProfile = TUBE_BANDS) =>
    progress(workingLevel, sets, { equipmentProfile });

  it("puts the target up 1 rep when every Set reaches it", () => {
    expect(progressBand(bandRow("light", 10), [banded(10), banded(11)])).toEqual({
      level: bandRow("light", 11, { movedBy: movedByThisWorkout, change: { code: "target-up" } }),
      change: { code: "target-up" },
    });
  });

  it("leaves the band and target as they are when a Set falls short", () => {
    expect(progressBand(bandRow("light", 12), [banded(12), banded(11)])).toMatchObject({
      level: { level: "light", reps: 12 },
      change: null,
    });
  });

  it.each([
    ["light", "medium"],
    ["medium", "heavy"],
  ])("steps from %s to %s, at the bottom of the range, when every Set reaches 15", (from, to) => {
    expect(progressBand(bandRow(from, 15), [banded(15), banded(16)])).toEqual({
      level: bandRow(to, 10, { movedBy: movedByThisWorkout, change: { code: "load-up" } }),
      change: { code: "load-up" },
    });
  });

  it("steps up to extra heavy when the profile has it", () => {
    const allBands: ProfileWithLoads = {
      tags: ["tube_bands"],
      loads: { tube_bands: { levels: ["light", "medium", "heavy", "extra_heavy"] } },
    };
    expect(progressBand(bandRow("heavy", 15), [banded(15), banded(15)], allBands)).toMatchObject({
      level: { level: "extra_heavy", reps: 10 },
    });
  });

  it("skips a band the profile doesn't have", () => {
    const lightAndHeavy: ProfileWithLoads = {
      tags: ["tube_bands"],
      loads: { tube_bands: { levels: ["light", "heavy"] } },
    };
    expect(progressBand(bandRow("light", 15), [banded(15), banded(15)], lightAndHeavy)).toMatchObject({
      level: { level: "heavy", reps: 10 },
    });
  });

  // As at the heaviest load (stories 34, 35)
  it("climbs to 20 reps at the heaviest band the profile has, then outgrows the Exercise", () => {
    expect(progressBand(bandRow("heavy", 15), [banded(15), banded(15)])).toMatchObject({
      level: { level: "heavy", reps: 16, outgrown: false },
      change: { code: "target-up" },
    });
    expect(progressBand(bandRow("heavy", 20), [banded(20), banded(20)])).toMatchObject({
      level: { level: "heavy", reps: 20, outgrown: true },
      change: { code: "outgrown" },
    });
  });
});

// Spec #119: Ballistic Exercises and carries get their rules from #136; until then they stay where they are
describe("progressWorkingLevel: Exercises without progression yet", () => {
  it.each([
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
