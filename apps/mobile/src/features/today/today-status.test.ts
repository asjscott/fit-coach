import { describe, expect, it } from "vitest";
import { todayStatus } from "./today-status";

describe("todayStatus", () => {
  it("numbers the next Workout against days per week", () => {
    expect(todayStatus({ state: "loaded", workoutCount: 2, target: 4 })).toBe("Workout 3 of 4 this week");
  });

  it("says when the week's target is already met", () => {
    expect(todayStatus({ state: "loaded", workoutCount: 4, target: 4 })).toBe("Workout 5 this week · 4 of 4 done");
  });

  it("numbers the next Workout without a target", () => {
    expect(todayStatus({ state: "loaded", workoutCount: 1, target: undefined })).toBe("Workout 2 this week");
  });

  it("welcomes a first Workout", () => {
    expect(todayStatus({ state: "first-run", workoutCount: 0, target: 4 })).toBe(
      "Your first Workout. Add Exercises as you go.",
    );
  });

  it("doesn't number the Workout offline, when it can't know this week's count", () => {
    expect(todayStatus({ state: "offline", workoutCount: 1, target: 4 })).toBe(
      "No connection. Workouts save on this phone until there is.",
    );
  });

  it("says nothing while History loads", () => {
    expect(todayStatus({ state: "loading", workoutCount: 0, target: 4 })).toBeNull();
  });
});
