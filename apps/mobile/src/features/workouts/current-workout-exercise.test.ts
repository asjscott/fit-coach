import { describe, expect, it } from "vitest";
import { currentWorkoutExercise } from "./current-workout-exercise";

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
});
