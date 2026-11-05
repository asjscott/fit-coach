import { describe, expect, it } from "vitest";
import { usualWorkoutLength } from "./workout-length";

describe("usualWorkoutLength", () => {
  it("is the Workout Length the user chose", () => {
    expect(usualWorkoutLength({ workoutLength: "short" })).toBe("short");
    expect(usualWorkoutLength({ workoutLength: "long" })).toBe("long");
  });

  it("counts a stored profile without one as Standard", () => {
    expect(usualWorkoutLength({})).toBe("standard");
  });
});
