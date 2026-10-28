import { describe, expect, it } from "vitest";
import { currentWorkoutExercise } from "./current-workout-exercise";

describe("currentWorkoutExercise", () => {
  it("is the last added when none has been chosen", () => {
    expect(
      currentWorkoutExercise({ ids: ["squat", "plank"], seenIds: ["squat", "plank"], chosenId: null, doneIds: null }),
    ).toBe("plank");
  });

  it("is none with no Workout Exercises", () => {
    expect(currentWorkoutExercise({ ids: [], seenIds: [], chosenId: null, doneIds: null })).toBeNull();
  });

  it("stays on the one the user tapped", () => {
    expect(
      currentWorkoutExercise({
        ids: ["squat", "plank"],
        seenIds: ["squat", "plank"],
        chosenId: "squat",
        doneIds: null,
      }),
    ).toBe("squat");
  });

  it("stays on the tapped one after it's moved to the end and back", () => {
    expect(
      currentWorkoutExercise({
        ids: ["plank", "squat"],
        seenIds: ["squat", "plank"],
        chosenId: "plank",
        doneIds: null,
      }),
    ).toBe("plank");
  });

  it("moves to a newly added one", () => {
    expect(
      currentWorkoutExercise({
        ids: ["squat", "plank", "row"],
        seenIds: ["squat", "plank"],
        chosenId: "squat",
        doneIds: null,
      }),
    ).toBe("row");
  });

  it("falls back to the last when the chosen one is removed", () => {
    expect(
      currentWorkoutExercise({
        ids: ["squat", "row"],
        seenIds: ["squat", "plank", "row"],
        chosenId: "plank",
        doneIds: null,
      }),
    ).toBe("row");
  });

  describe("in an Assessment Workout", () => {
    const tests = ["goblet-squat", "deadlift", "plank"];

    it("opens on the first test", () => {
      expect(currentWorkoutExercise({ ids: tests, seenIds: tests, chosenId: null, doneIds: [] })).toBe("goblet-squat");
    });

    it("opens on the first test that isn't done", () => {
      expect(currentWorkoutExercise({ ids: tests, seenIds: tests, chosenId: null, doneIds: ["goblet-squat"] })).toBe(
        "deadlift",
      );
    });

    it("opens on the last test when every test is done", () => {
      expect(currentWorkoutExercise({ ids: tests, seenIds: tests, chosenId: null, doneIds: tests })).toBe("plank");
    });

    it("stays on the test the user tapped", () => {
      expect(currentWorkoutExercise({ ids: tests, seenIds: tests, chosenId: "plank", doneIds: [] })).toBe("plank");
    });
  });
});
