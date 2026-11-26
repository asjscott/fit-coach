import type { InProgressWorkout, Set } from "@fit/shared";
import { describe, expect, it } from "vitest";
import {
  backHold,
  guidedHold,
  guidedPlace,
  guidedStep,
  holdAlone,
  holdLogged,
  holdsDone,
  isGuidedWorkout,
  skipHold,
  startGuidedRun,
  type GuidedCourse,
} from "./guided-flow";
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
    const { current, next, position, count, done } = guidedPlace(workout, { skips });
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
    expect(where(walkAndMobility(1), { "cat-cow": [1] })).toEqual(["open-book", "open-book", 3, 4, 1]);
    expect(where(walkAndMobility(0, 0), { "cat-cow": [0, 1], "open-book": [0, 1] })).toEqual([
      undefined,
      undefined,
      4,
      4,
      0,
    ]);
  });

  it("counts Sets past the plan as done without passing over another hold", () => {
    expect(where(walkAndMobility(3))).toEqual(["open-book", "open-book", 3, 4, 3]);
  });
});

describe("going back", () => {
  const twice = (logged = 0, openBook = 0) =>
    workoutOf({ slug: "cat-cow", sets: 2, logged }, { slug: "open-book", sets: 1, logged: openBook });
  const start: GuidedCourse = { skips: {} };
  const where = (workout: ReturnType<typeof workoutOf>, course: GuidedCourse) => {
    const { current, position, replaces, next } = guidedPlace(workout, course);
    return [current?.slug, position, replaces, next?.slug];
  };

  it("repeats the previous hold, replacing its Set, then returns to the first not logged", () => {
    const back = backHold(twice(2), start);
    expect(where(twice(2), back)).toEqual(["cat-cow", 2, 1, "open-book"]);
    expect(where(twice(2), holdLogged(twice(2), back))).toEqual(["open-book", 3, undefined, undefined]);
    expect(where(twice(2), backHold(twice(2), back))).toEqual(["cat-cow", 1, 0, "open-book"]);
  });

  it("stays at the first hold, with nothing before it", () => {
    expect(guidedPlace(twice(), start).hasPrevious).toBe(false);
    expect(where(twice(), backHold(twice(), start))).toEqual(["cat-cow", 1, undefined, "cat-cow"]);
  });

  it("keeps the old Set when a repeat is skipped", () => {
    expect(skipHold(twice(1), backHold(twice(1), start))).toEqual(start);
  });

  it("does a skipped hold, logging it rather than replacing another's Set", () => {
    const skipped = skipHold(twice(), start);
    expect(where(twice(), skipped)).toEqual(["cat-cow", 2, undefined, "open-book"]);
    const back = backHold(twice(1), backHold(twice(1), skipped));
    expect(where(twice(1), back)).toEqual(["cat-cow", 1, undefined, "open-book"]);
    expect(holdLogged(twice(1), back)).toEqual({ skips: { "cat-cow": [] } });
  });

  it("replaces the Set of a hold skipped, then logged on the ordinary screen", () => {
    const skipped = skipHold(twice(1), start);
    expect(where(twice(2), backHold(twice(2), skipped))).toEqual(["cat-cow", 2, 1, "open-book"]);
  });

  it("returns to a hold whose Set was removed on the ordinary screen", () => {
    expect(where(twice(1, 1), start)).toEqual(["cat-cow", 2, undefined, undefined]);
  });
});

describe("holdsDone", () => {
  it("counts each hold with a Set once, as the finish screen lists them, and not the walk", () => {
    const workout = workoutOf(
      { slug: "walk", logged: 1 },
      { slug: "cat-cow", sets: 2, logged: 2 },
      { slug: "open-book", sets: 2, logged: 1 },
      { slug: "pigeon", sets: 2 },
    );
    expect(holdsDone(workout)).toBe(2);
  });
});

describe("holdAlone", () => {
  const manual = workoutOf({ slug: "plank" }, { slug: "open-book", planned: false, logged: 1 });
  const openBook = manual.workoutExercises[1]!;

  it("times the next Set of a Recovery Exercise for its library seconds, and Back its last", () => {
    const course = holdAlone(openBook, manual)!;
    const place = guidedPlace(manual, course);
    expect(place).toMatchObject({ current: { slug: "open-book", seconds: 45, sides: 2 }, next: null, position: 2 });
    expect(guidedPlace(manual, backHold(manual, course))).toMatchObject({ position: 1, replaces: 0 });
  });

  it("is over once its Set is logged", () => {
    const course = holdAlone(openBook, manual)!;
    const logged = workoutOf({ slug: "plank" }, { slug: "open-book", planned: false, logged: 2 });
    expect(guidedPlace(logged, holdLogged(manual, course)).current).toBeNull();
  });

  it("is not for the walk, a strength Exercise, a hold the guided flow runs, or a past Workout", () => {
    const alone = (workout: ReturnType<typeof workoutOf> & { pastStart?: string }) =>
      holdAlone(workout.workoutExercises[0]!, workout);
    expect(alone(workoutOf({ slug: "walk", planned: false }))).toBeNull();
    expect(alone(workoutOf({ slug: "plank", planned: false }))).toBeNull();
    expect(alone(mobility)).toBeNull();
    expect(alone({ ...workoutOf({ slug: "cat-cow", planned: false }), pastStart: "2026-11-20T10:00:00Z" })).toBeNull();
  });
});

describe("guidedHold", () => {
  it("gives 10 s before each side and ends at the target", () => {
    const [first, second] = [guidedPlace(mobility, { skips: {} }).current!, guidedPlace(mobility, { skips: {} }).next!];
    expect(guidedHold(first)).toEqual({ leadInSeconds: 10, sides: 1, ends: "at-target", target: { min: 45 } });
    expect(guidedHold(second)).toEqual({ leadInSeconds: 10, sides: 2, ends: "at-target", target: { min: 30 } });
  });
});

describe("guidedStep", () => {
  const START = Date.parse("2026-11-25T10:00:00Z");
  const after = (seconds: number) => new Date(START + seconds * 1000);
  const run: HoldRun = { startedAt: START, pauses: [] };
  const hold = guidedHold(guidedPlace(mobility, { skips: {} }).next!);
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
