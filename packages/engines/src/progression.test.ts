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

  // Story 35: outgrown only at the load ceiling
  it("holds at 20 reps, not outgrown, while a heavier load is there but Epley can't reach it yet", () => {
    const farApart: ProfileWithLoads = {
      tags: ["dumbbells"],
      loads: { dumbbells: { kind: "fixed", weightsKg: [8, 24] } },
    };
    expect(progress(gobletSquat(8, 20), [lifted(8, 20), lifted(8, 20)], { equipmentProfile: farApart })).toEqual({
      level: gobletSquat(8, 20, { movedBy: movedByThisWorkout }),
      change: null,
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

// Stories 43–44, ADR 0007: an RPE of 10 on the last Set holds the load and the target
describe("progressWorkingLevel: RPE on the last Set", () => {
  const held = { movedBy: movedByThisWorkout, change: { code: "rpe-10" as const } };

  // Story 44
  it("holds the load at the top of the range when the last Set was RPE 10", () => {
    expect(progress(gobletSquat(20, 12), [lifted(20, 12), lifted(20, 12), lifted(20, 12, 10)])).toEqual({
      level: gobletSquat(20, 12, held),
      change: { code: "rpe-10" },
    });
  });

  it("holds the target when every Set reached it and the last was RPE 10", () => {
    expect(progress(gobletSquat(14, 9), [lifted(14, 9), lifted(14, 9, 10)])).toEqual({
      level: gobletSquat(14, 9, held),
      change: { code: "rpe-10" },
    });
  });

  it("holds the prescribed load when the last Set, at another load, was RPE 10", () => {
    expect(progress(gobletSquat(14, 10), [lifted(16, 9), lifted(16, 9, 10)])).toMatchObject({
      level: { kg: 14, reps: 10 },
      change: { code: "rpe-10" },
    });
  });

  it("goes by the last Set logged, not the last at the load it judges", () => {
    const sets = [lifted(14, 12), lifted(14, 12), lifted(16, 6, 10)];
    expect(progress(gobletSquat(14, 11), sets)).toMatchObject({
      level: { kg: 14, reps: 11 },
      change: { code: "rpe-10" },
    });
  });

  it.each([
    ["an RPE of 9 on the last Set", [lifted(14, 9), lifted(14, 9, 9)]],
    ["an RPE of 10 on an earlier Set", [lifted(14, 9, 10), lifted(14, 9)]],
  ])("progresses as usual after %s", (_, sets) => {
    expect(progress(gobletSquat(14, 9), sets)).toMatchObject({
      level: { kg: 14, reps: 10 },
      change: { code: "target-up" },
    });
  });

  // Stories 44, 46: a Miss is a Miss however hard the last Set felt
  it("still counts a Miss when the last Set was RPE 10", () => {
    expect(progress(gobletSquat(14, 10), [lifted(14, 7), lifted(14, 7, 10)])).toMatchObject({
      level: { kg: 14, reps: 10, misses: 1 },
      change: null,
    });
  });

  // Stories 44, 47: RPE 10 holds even the second Miss in a row, which still counts towards the run
  it("holds the load and target on a second Miss in a row when the last Set was RPE 10", () => {
    expect(progress(gobletSquat(14, 10, { misses: 1 }), [lifted(14, 7), lifted(14, 7, 10)])).toEqual({
      level: gobletSquat(14, 10, { movedBy: movedByThisWorkout, misses: 2, change: { code: "rpe-10" } }),
      change: { code: "rpe-10" },
    });
  });

  it("brings it down on the next Miss without RPE 10, the run having carried on", () => {
    expect(progress(gobletSquat(14, 10, { misses: 2 }), [lifted(14, 7), lifted(14, 7)])).toMatchObject({
      level: { kg: 14, reps: 8, misses: 0 },
      change: { code: "target-down" },
    });
  });

  it("ends a run of Misses when it holds", () => {
    expect(progress(gobletSquat(14, 10, { misses: 1 }), [lifted(14, 10), lifted(14, 10, 10)])).toMatchObject({
      level: { kg: 14, reps: 10, misses: 0 },
      change: { code: "rpe-10" },
    });
  });

  // Spec: an RPE of 10 holds every Exercise, ahead of the ladders
  it("holds a bodyweight ladder when the last Set was RPE 10", () => {
    const pushUps = level("push-up", { unit: "reps", reps: 10 });
    expect(progress(pushUps, [repsDone(10), { ...repsDone(12), rpe: 10 }])).toEqual({
      level: { ...pushUps, movedBy: movedByThisWorkout, change: { code: "rpe-10" } },
      change: { code: "rpe-10" },
    });
  });
});
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

// Kettlebells at home: 8 to 24 kg in 4 kg steps
const KETTLEBELLS: ProfileWithLoads = {
  tags: ["kettlebells"],
  loads: { kettlebells: { weightsKg: [8, 12, 16, 20, 24] } },
};

// Stories 60–62, spec #119 "Ballistic Exercises": a fixed 8 reps, moving only by load, carefully
describe("progressWorkingLevel: Ballistic Exercises", () => {
  const swing = (kg: number, extra: Partial<WorkingLevel> = {}) =>
    level("kettlebell-swing", { unit: "kg", kg, reps: 8, ...extra });
  const swings = (workingLevel: WorkingLevel, sets: Set[]) =>
    progress(workingLevel, sets, { equipmentProfile: KETTLEBELLS });

  // Story 61
  it("goes up a Load Step, still at 8 reps, when every Set reaches 8 and the last Set's RPE is 7 or lower", () => {
    expect(swings(swing(16), [lifted(16, 8), lifted(16, 8), lifted(16, 8, 7)])).toEqual({
      level: swing(20, { movedBy: movedByThisWorkout, workoutsSinceLoadUp: 0, change: { code: "load-up" } }),
      change: { code: "load-up" },
    });
  });

  it.each([
    ["RPE 8", 8],
    ["RPE 9", 9],
  ])("holds the load at %s, counting the Workout", (_, rpe) => {
    expect(swings(swing(16), [lifted(16, 8), lifted(16, 8, rpe)])).toEqual({
      level: swing(16, { movedBy: movedByThisWorkout, workoutsSinceLoadUp: 1 }),
      change: null,
    });
  });

  it("holds the load at RPE 10, with its reason", () => {
    expect(swings(swing(16), [lifted(16, 8), lifted(16, 8, 10)])).toMatchObject({
      level: { kg: 16, reps: 8, workoutsSinceLoadUp: 1 },
      change: { code: "rpe-10" },
    });
  });

  it("holds the load when a Set falls short of 8, however easy", () => {
    expect(swings(swing(16), [lifted(16, 8), lifted(16, 7, 6)])).toMatchObject({
      level: { kg: 16, reps: 8, workoutsSinceLoadUp: 1 },
      change: null,
    });
  });

  // Story 61: with no RPE logged, at most once every 3 Workouts
  it("goes up a Load Step with no RPE logged only on the 3rd Workout since the load last went up", () => {
    const first = swings(swing(16), [lifted(16, 8), lifted(16, 8)]);
    expect(first).toMatchObject({ level: { kg: 16, workoutsSinceLoadUp: 1 }, change: null });
    const second = swings(swing(16, { workoutsSinceLoadUp: 1 }), [lifted(16, 8), lifted(16, 8)]);
    expect(second).toMatchObject({ level: { kg: 16, workoutsSinceLoadUp: 2 }, change: null });
    const third = swings(swing(16, { workoutsSinceLoadUp: 2 }), [lifted(16, 8), lifted(16, 8)]);
    expect(third).toMatchObject({ level: { kg: 20, reps: 8, workoutsSinceLoadUp: 0 }, change: { code: "load-up" } });
  });

  it("counts Workouts held by RPE towards the 3", () => {
    expect(swings(swing(16, { workoutsSinceLoadUp: 2 }), [lifted(16, 8), lifted(16, 8)])).toMatchObject({
      change: { code: "load-up" },
    });
  });

  it("holds at the heaviest kettlebell the profile has", () => {
    expect(swings(swing(24), [lifted(24, 8), lifted(24, 8, 6)])).toMatchObject({
      level: { kg: 24, reps: 8, outgrown: false },
      change: null,
    });
  });

  it("makes a load other than the one prescribed the new base, at 8 reps, starting the count again", () => {
    expect(swings(swing(16, { workoutsSinceLoadUp: 2 }), [lifted(20, 8), lifted(20, 6)])).toMatchObject({
      level: { kg: 20, reps: 8, workoutsSinceLoadUp: 0 },
      change: { code: "new-base" },
    });
  });

  it("still counts a Miss, and the second in a row brings it down a Load Step", () => {
    expect(swings(swing(16), [lifted(16, 5), lifted(16, 5)])).toMatchObject({ level: { kg: 16, misses: 1 } });
    expect(swings(swing(16, { misses: 1 }), [lifted(16, 5), lifted(16, 5)])).toMatchObject({
      change: { code: "target-down" },
    });
  });

  // Story 62
  it("never moves a jump, a bodyweight Ballistic Exercise, however the Sets went", () => {
    const jump = level("box-jump", { unit: "reps", reps: 5 });
    expect(progress(jump, [repsDone(5), { ...repsDone(5), rpe: 6 }])).toBeNull();
    expect(progress(jump, [repsDone(9), repsDone(9)])).toBeNull();
  });
});

// Story 63, spec #119 "Carries": only a different logged load moves a carry
describe("progressWorkingLevel: carries", () => {
  const carry = (kg: number, extra: Partial<WorkingLevel> = {}) =>
    level("farmers-carry", { unit: "kg", kg, reps: 8, ...extra });

  it("moves to a different load the user logs, keeping its reps", () => {
    expect(progress(carry(20), [lifted(24, 30), lifted(24, 25)])).toEqual({
      level: carry(24, { movedBy: movedByThisWorkout, change: { code: "new-base" } }),
      change: { code: "new-base" },
    });
  });

  it("leaves the load and reps as they are at the same load, however many reps, recording the Workout", () => {
    expect(progress(carry(20), [lifted(20, 30), lifted(20, 40)])).toEqual({
      level: carry(20, { movedBy: movedByThisWorkout }),
      change: null,
    });
  });

  it("never counts a Miss, however few reps", () => {
    expect(progress(carry(20, { misses: 0 }), [lifted(20, 1), lifted(20, 1)])).toMatchObject({
      level: { kg: 20, reps: 8, misses: 0 },
      change: null,
    });
  });

  it("moves to a different load even when the last Set was RPE 10", () => {
    expect(progress(carry(20), [lifted(16, 8), lifted(16, 8, 10)])).toMatchObject({
      level: { kg: 16, reps: 8 },
      change: { code: "new-base" },
    });
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

// Stories 67, 68, ADR 0007: the deload week's lighter Sets leave every Working Level as it is
describe("progressWorkingLevel: the deload week", () => {
  const deload = { deloadWeek: true };

  // Story 67
  it("moves nothing when every Set reaches the target", () => {
    expect(progress(gobletSquat(14, 9), [lifted(14, 12), lifted(14, 12)], deload)).toBeNull();
  });

  // Story 67
  it("doesn't take the deload week's lighter load as a new base", () => {
    expect(progress(gobletSquat(14, 9), [lifted(12, 9), lifted(12, 9)], deload)).toBeNull();
  });

  // Story 68
  it("neither adds a Miss nor ends the run of Misses", () => {
    const level = gobletSquat(14, 10, { misses: 1 });
    expect(progress(level, [lifted(14, 6), lifted(14, 6)], deload)).toBeNull();
    expect(progress(level, [lifted(14, 10), lifted(14, 10)], deload)).toBeNull();
  });

  it("leaves a Ballistic Exercise's count of Workouts since its last load up untouched", () => {
    const swing = level("kettlebell-swing", { unit: "kg", kg: 16, reps: 8, workoutsSinceLoadUp: 2 });
    expect(progress(swing, [lifted(16, 8), lifted(16, 8)], { ...deload, equipmentProfile: KETTLEBELLS })).toBeNull();
  });
});
