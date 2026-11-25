import type { InProgressWorkout, Set } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { guidedHold, guidedPlace, guidedStep, isGuidedWorkout, startGuidedRun } from "./guided-flow";
import type { HoldRun } from "./hold-timer";

const held: Set = { kind: "timed", seconds: 45, loggedAt: "2026-11-25T10:00:00Z" };
type Entry = { slug: string; sets?: number; seconds?: number; logged?: number; planned?: boolean };
const workoutOf = (...entries: Entry[]): Pick<InProgressWorkout, "workoutExercises"> => ({
  workoutExercises: entries.map(({ slug, sets = 1, seconds = 45, logged = 0, planned = true }) => ({
    id: slug,
    slug,
    loadType: "timed",
    sets: Array.from({ length: logged }, () => held),
    ...(planned && { planned: { sets, target: { unit: "seconds", seconds } } }),
  })) as InProgressWorkout["workoutExercises"],
});

const mobility = workoutOf({ slug: "cat-cow" }, { slug: "open-book", seconds: 30 });

describe("isGuidedWorkout", () => {
  it("is a Workout of planned Recovery Exercises, with a walk or without", () => {
    expect(isGuidedWorkout(mobility)).toBe(true);
    expect(isGuidedWorkout(workoutOf({ slug: "walk" }, { slug: "cat-cow" }))).toBe(true);
  });

  it("is no training, unplanned, past or empty Workout, nor only a walk", () => {
    expect(isGuidedWorkout(workoutOf({ slug: "plank" }, { slug: "cat-cow" }))).toBe(false);
    expect(isGuidedWorkout(workoutOf({ slug: "cat-cow", planned: false }))).toBe(false);
    expect(isGuidedWorkout({ ...mobility, pastStart: "2026-11-20T10:00:00Z" })).toBe(false);
    expect(isGuidedWorkout(workoutOf())).toBe(false);
    expect(isGuidedWorkout(workoutOf({ slug: "walk" }))).toBe(false);
  });
});

describe("guidedPlace", () => {
  const walkAndMobility = (catCow = 0, openBook = 0) =>
    workoutOf(
      { slug: "walk", logged: 1 },
      { slug: "cat-cow", sets: 2, logged: catCow },
      { slug: "open-book", sets: 2, logged: openBook },
    );
  const where = (workout: ReturnType<typeof workoutOf>, skips = {}) => {
    const { current, next, position, count, done } = guidedPlace(workout, skips);
    return [current?.slug, next?.slug, position, count, done];
  };

  it("starts at the first hold, leaving out the walk", () => {
    expect(where(walkAndMobility())).toEqual(["cat-cow", "cat-cow", 1, 4, 0]);
  });

  it("goes by the logged Sets", () => {
    expect(where(walkAndMobility(1))).toEqual(["cat-cow", "open-book", 2, 4, 1]);
    expect(where(walkAndMobility(2, 1))).toEqual(["open-book", undefined, 4, 4, 3]);
  });

  it("is over once every hold is logged", () => {
    expect(where(walkAndMobility(2, 2))).toEqual([undefined, undefined, 4, 4, 4]);
  });

  it("passes over this run's skips, which aren't done", () => {
    expect(where(walkAndMobility(1), { "cat-cow": 1 })).toEqual(["open-book", "open-book", 3, 4, 1]);
    expect(where(walkAndMobility(0, 0), { "cat-cow": 2, "open-book": 2 })).toEqual([undefined, undefined, 4, 4, 0]);
  });

  it("counts Sets past the plan as done without passing over another hold", () => {
    expect(where(walkAndMobility(3))).toEqual(["open-book", "open-book", 3, 4, 3]);
  });
});

describe("guidedHold", () => {
  it("gives 10 s before each side and ends at the target", () => {
    const [first, second] = [guidedPlace(mobility, {}).current!, guidedPlace(mobility, {}).next!];
    expect(guidedHold(first)).toEqual({ leadInSeconds: 10, sides: 1, ends: "at-target", target: { min: 45 } });
    expect(guidedHold(second)).toEqual({ leadInSeconds: 10, sides: 2, ends: "at-target", target: { min: 30 } });
  });
});

describe("guidedStep", () => {
  const START = Date.parse("2026-11-25T10:00:00Z");
  const after = (seconds: number) => new Date(START + seconds * 1000);
  const run: HoldRun = { startedAt: START, pauses: [] };
  const hold = guidedHold(guidedPlace(mobility, {}).next!);
  const step = (from: number, to: number, of = run) => guidedStep(hold, of, after(from), after(to));

  it("cues the start, the last 3 seconds and the end, with no end until both sides are done", () => {
    expect(step(9.95, 10.05)).toMatchObject({ alert: "long", done: false });
    expect(step(36.95, 37.05)).toMatchObject({ alert: "short", done: false });
    expect(step(39.95, 40.05)).toMatchObject({ alert: "long", done: false });
    expect(step(60, 60.1)).toMatchObject({ alert: null, done: false });
    expect(step(79.95, 80.05)).toMatchObject({ alert: "long", done: true });
  });

  it("pauses where it was after time it wasn't running, rather than finishing the hold", () => {
    const { run: paused, alert, done } = step(20, 300);
    expect(paused.pauses).toEqual([{ from: START + 20_000 }]);
    expect([alert, done]).toEqual([null, false]);
  });

  it("does nothing while paused", () => {
    const paused = { ...run, pauses: [{ from: START + 20_000 }] };
    expect(step(21, 300, paused)).toEqual({ run: paused, alert: null, done: false });
  });
});

describe("startGuidedRun", () => {
  it("starts the next hold paused when the last one was paused as it ended", () => {
    const now = new Date("2026-11-25T10:00:00Z");
    expect(startGuidedRun(now)).toEqual({ startedAt: now.getTime(), pauses: [] });
    expect(startGuidedRun(now, true).pauses).toEqual([{ from: now.getTime() }]);
  });
});
