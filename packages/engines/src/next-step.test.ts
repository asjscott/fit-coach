import { describe, expect, it } from "vitest";
import { nextPlannedExercise, nextStep } from "./next-step";

const exercise = (id: string, logged: number, planned?: number, supersetWith?: string) => ({
  id,
  sets: Array.from({ length: logged }, () => ({})),
  planned: planned ? { sets: planned, target: { unit: "reps" as const, reps: 8 }, supersetWith } : undefined,
});
type Exercise = ReturnType<typeof exercise>;

const stepAfter = (id: string, ...workoutExercises: Exercise[]) => nextStep({ workoutExercises }, id);

describe("nextStep", () => {
  it("is none while the Exercise has planned Sets left", () => {
    expect(stepAfter("squat", exercise("squat", 2, 3), exercise("row", 0, 3))).toBeNull();
  });

  it("is the next Exercise, as the main button, once it has them all or more", () => {
    const next = { to: "exercise", id: "row", main: true };
    expect(stepAfter("squat", exercise("squat", 3, 3), exercise("row", 0, 3))).toEqual(next);
    expect(stepAfter("squat", exercise("squat", 4, 3), exercise("row", 0, 3))).toEqual(next);
  });

  it("wraps to an Exercise that was skipped", () => {
    expect(stepAfter("row", exercise("squat", 1, 3), exercise("row", 3, 3))).toEqual({
      to: "exercise",
      id: "squat",
      main: true,
    });
  });

  it("is Finish once every planned Set is done", () => {
    expect(stepAfter("squat", exercise("squat", 3, 3), exercise("row", 3, 3))).toEqual({ to: "finish", main: true });
  });

  it("is none when its Exercise has been removed", () => {
    expect(stepAfter("squat", exercise("row", 0, 3))).toBeNull();
  });

  describe("in a superset", () => {
    const pair = (a: number, b: number) => [
      exercise("press", a, 2, "row"),
      exercise("row", b, 3, "press"),
      exercise("curl", 0, 2),
    ];

    it("is none until both Exercises are done", () => {
      expect(stepAfter("press", ...pair(2, 2))).toBeNull();
      expect(stepAfter("row", ...pair(1, 3))).toBeNull();
    });

    it("is the Exercise after the pair, from either, once both are", () => {
      const next = { to: "exercise", id: "curl", main: true };
      expect(stepAfter("press", ...pair(2, 3))).toEqual(next);
      expect(stepAfter("row", ...pair(2, 3))).toEqual(next);
    });
  });

  describe("in a Manual Workout", () => {
    it("is the Exercise after it, as a secondary button, from its first Set", () => {
      expect(stepAfter("squat", exercise("squat", 0), exercise("row", 0))).toBeNull();
      expect(stepAfter("squat", exercise("squat", 1), exercise("row", 2))).toEqual({
        to: "exercise",
        id: "row",
        main: false,
      });
    });

    it("is none on the last Exercise, however the others stand", () => {
      expect(stepAfter("row", exercise("squat", 0), exercise("row", 3))).toBeNull();
    });
  });

  it("is secondary after a Set of an Exercise added to a planned Workout", () => {
    expect(stepAfter("curl", exercise("squat", 0, 3), exercise("curl", 1))).toEqual({
      to: "exercise",
      id: "squat",
      main: false,
    });
    expect(stepAfter("curl", exercise("squat", 3, 3), exercise("curl", 1))).toEqual({ to: "finish", main: false });
  });

  it("is none in an Assessment Workout, which has Next test", () => {
    const workoutExercises = [exercise("squat", 2), exercise("plank", 0)];
    expect(nextStep({ workoutExercises, assessment: "single" }, "squat")).toBeNull();
  });
});

describe("nextPlannedExercise", () => {
  const planned = { sets: 3, target: { unit: "reps", reps: 8 } } as const;

  it("is the first Exercise of a Workout just started from a plan", () => {
    expect(
      nextPlannedExercise([
        { id: "squat", sets: [], planned },
        { id: "row", sets: [], planned },
      ]),
    ).toBe("squat");
  });

  it("is the first still short of its target Sets when the Workout is reopened", () => {
    expect(
      nextPlannedExercise([
        { id: "squat", sets: [{}, {}, {}], planned },
        { id: "row", sets: [{}], planned },
        { id: "press", sets: [], planned },
      ]),
    ).toBe("row");
  });

  it("is the next in order after the current one, wrapping to any skipped", () => {
    const workoutExercises = [
      { id: "squat", sets: [], planned },
      { id: "row", sets: [{}, {}, {}], planned },
      { id: "press", sets: [{}, {}, {}], planned },
      { id: "curl", sets: [{}], planned },
    ];
    expect(nextPlannedExercise(workoutExercises, "row")).toBe("curl");
    expect(nextPlannedExercise(workoutExercises, "curl")).toBe("squat");
  });

  it("treats a superset as one step, opening on whoever's turn it is", () => {
    const pairOf = (press: number, row: number) => [
      { id: "squat", sets: [], planned },
      { id: "press", sets: Array(press).fill({}), planned: { ...planned, supersetWith: "row" } },
      { id: "curl", sets: [], planned },
      { id: "row", sets: Array(row).fill({}), planned: { ...planned, supersetWith: "press" } },
    ];
    expect(nextPlannedExercise(pairOf(3, 3), "row")).toBe("curl");
    expect(nextPlannedExercise(pairOf(1, 0), "squat")).toBe("row");
  });

  it("is none in a Manual Workout", () => {
    expect(nextPlannedExercise([{ id: "squat", sets: [] }])).toBeUndefined();
  });

  it("is none once every target is met", () => {
    expect(nextPlannedExercise([{ id: "squat", sets: [{}, {}, {}], planned }])).toBeUndefined();
  });
});
