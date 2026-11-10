import { describe, expect, it } from "vitest";
import { currentWorkoutExercise, nextPlannedExercise } from "./current-workout-exercise";

const planned = { sets: 3, target: { unit: "reps", reps: 8 } } as const;

describe("nextPlannedExercise", () => {
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

  it("is none in a Manual Workout", () => {
    expect(nextPlannedExercise([{ id: "squat", sets: [] }])).toBeUndefined();
  });

  it("is none once every target is met", () => {
    expect(nextPlannedExercise([{ id: "squat", sets: [{}, {}, {}], planned }])).toBeUndefined();
  });
});

describe("currentWorkoutExercise", () => {
  it("is the last added when none has been chosen", () => {
    expect(currentWorkoutExercise({ ids: ["squat", "plank"], seenIds: ["squat", "plank"], chosenId: null })).toBe(
      "plank",
    );
  });

  it("is none with no Workout Exercises", () => {
    expect(currentWorkoutExercise({ ids: [], seenIds: [], chosenId: null })).toBeNull();
  });

  it("stays on the one the user tapped", () => {
    expect(currentWorkoutExercise({ ids: ["squat", "plank"], seenIds: ["squat", "plank"], chosenId: "squat" })).toBe(
      "squat",
    );
  });

  it("stays on the tapped one after it's moved to the end and back", () => {
    expect(currentWorkoutExercise({ ids: ["plank", "squat"], seenIds: ["squat", "plank"], chosenId: "plank" })).toBe(
      "plank",
    );
  });

  it("moves to a newly added one", () => {
    expect(
      currentWorkoutExercise({ ids: ["squat", "plank", "row"], seenIds: ["squat", "plank"], chosenId: "squat" }),
    ).toBe("row");
  });

  it("falls back to the last when the chosen one is removed", () => {
    expect(
      currentWorkoutExercise({ ids: ["squat", "row"], seenIds: ["squat", "plank", "row"], chosenId: "plank" }),
    ).toBe("row");
  });

  describe("in an Assessment Workout", () => {
    const tests = ["goblet-squat", "deadlift", "plank"];

    it("opens on the next test, the first that isn't done", () => {
      expect(currentWorkoutExercise({ ids: tests, seenIds: tests, chosenId: null, nextId: "deadlift" })).toBe(
        "deadlift",
      );
    });

    it("opens on the last test when every test is done", () => {
      expect(currentWorkoutExercise({ ids: tests, seenIds: tests, chosenId: null, nextId: undefined })).toBe("plank");
    });

    it("stays on the open test once it's done, for Next test to move on", () => {
      expect(currentWorkoutExercise({ ids: tests, seenIds: tests, chosenId: "goblet-squat", nextId: "deadlift" })).toBe(
        "goblet-squat",
      );
    });
  });
});
