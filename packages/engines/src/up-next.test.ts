import type { InProgressWorkoutExercise } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { upNext } from "./up-next";

const exercise = (id: string, logged: number, planned?: number, supersetWith?: string): InProgressWorkoutExercise => ({
  id,
  slug: id,
  loadType: "bodyweight",
  sets: Array.from({ length: logged }, () => ({
    kind: "bodyweight" as const,
    reps: 8,
    loggedAt: "2026-11-24T10:00:00.000Z",
  })),
  planned: planned ? { sets: planned, target: { unit: "reps", reps: 8 }, supersetWith } : undefined,
});

// What comes after a Set of `after`, as "squat, Set 2 of 3"
function next(workoutExercises: InProgressWorkoutExercise[], after: string, takesSets?: (id: string) => boolean) {
  const up = upNext(workoutExercises, after, takesSets && (({ id }) => takesSets(id)));
  return up && `${up.workoutExercise.id}, Set ${up.setNumber}${up.plannedSets ? ` of ${up.plannedSets}` : ""}`;
}

describe("what's next while resting", () => {
  it("is the Exercise's next Set while it has Sets left", () => {
    expect(next([exercise("squat", 1, 3), exercise("row", 0, 3)], "squat")).toBe("squat, Set 2 of 3");
  });

  it("is the next Exercise with Sets left once it has them all", () => {
    expect(next([exercise("squat", 3, 3), exercise("row", 2, 2), exercise("curl", 1, 3)], "squat")).toBe(
      "curl, Set 2 of 3",
    );
  });

  it("is the next in order after it, though one before it was skipped", () => {
    expect(next([exercise("squat", 0, 3), exercise("row", 2, 2), exercise("curl", 1, 3)], "row")).toBe(
      "curl, Set 2 of 3",
    );
  });

  it("is nothing once every planned Set is done", () => {
    expect(next([exercise("squat", 3, 3), exercise("row", 2, 2)], "row")).toBeNull();
  });

  it("is the Exercise's next Set with no plan, as any Set may be the last", () => {
    expect(next([exercise("squat", 2), exercise("row", 0)], "squat")).toBe("squat, Set 3");
  });

  it("is nothing when its Exercise has been removed and no plan says what's left", () => {
    expect(next([exercise("row", 0)], "squat")).toBeNull();
  });

  describe("in a superset", () => {
    const pair = (a: number, b: number, aSets = 3, bSets = 3) => [
      exercise("press", a, aSets, "row"),
      exercise("row", b, bSets, "press"),
      exercise("curl", 0, 2),
    ];

    it("is the pair's first Exercise after a round", () => {
      expect(next(pair(1, 1), "row")).toBe("press, Set 2 of 3");
    });

    it("is the one with Sets left once the other is done", () => {
      expect(next(pair(2, 2, 2, 3), "press")).toBe("row, Set 3 of 3");
    });

    it("is the Exercise after the pair once both are done", () => {
      expect(next(pair(3, 3), "row")).toBe("curl, Set 1 of 2");
    });

    it("is whoever's turn it is in a pair still to do", () => {
      expect(
        next([exercise("curl", 2, 2), exercise("press", 1, 3, "row"), exercise("row", 0, 3, "press")], "curl"),
      ).toBe("row, Set 1 of 3");
    });
  });

  describe("in an Assessment Workout", () => {
    const tests = [exercise("squat", 2), exercise("push-up", 0), exercise("plank", 0)];

    it("is the test's next Set until it's done", () => {
      expect(next(tests, "squat", () => true)).toBe("squat, Set 3");
    });

    it("is the next test once it's done", () => {
      expect(next(tests, "squat", (id) => id !== "squat")).toBe("push-up, Set 1");
    });

    it("is nothing once every test is done", () => {
      expect(next(tests, "squat", () => false)).toBeNull();
    });
  });
});
