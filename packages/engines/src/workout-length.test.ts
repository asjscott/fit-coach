import { describe, expect, it } from "vitest";
import { secondsForSets, usualWorkoutLength } from "./workout-length";

describe("secondsForSets", () => {
  it("leaves each Workout Length less its 5-minute warm-up", () => {
    expect(secondsForSets("short")).toBe(1500);
    expect(secondsForSets("standard")).toBe(2400);
    expect(secondsForSets("long")).toBe(3300);
  });
});

describe("usualWorkoutLength", () => {
  it("is the Workout Length the user chose", () => {
    expect(usualWorkoutLength({ workoutLength: "short" })).toBe("short");
    expect(usualWorkoutLength({ workoutLength: "long" })).toBe("long");
  });

  it("counts a stored profile without one as Standard", () => {
    expect(usualWorkoutLength({})).toBe("standard");
  });
});
