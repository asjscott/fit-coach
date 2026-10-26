import type { InProgressWorkout } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { showsResumePill } from "./resume-pill";

const workout: InProgressWorkout = {
  id: "8d0f7a52-4c1e-4f7b-9a57-2f3c1c9b6e10",
  startedAt: "2026-10-25T09:00:00.000Z",
  workoutExercises: [],
};

describe("showsResumePill", () => {
  it("shows on the other tabs while a Workout is in progress", () => {
    for (const tab of ["/history", "/exercises/goblet-squat", "/profile"]) {
      expect(showsResumePill(workout, tab)).toBe(true);
    }
  });

  it("hides on Today, whose main button already resumes the Workout", () => {
    expect(showsResumePill(workout, "/")).toBe(false);
  });

  it("hides without a Workout in progress", () => {
    expect(showsResumePill(null, "/history")).toBe(false);
  });

  it("hides while the Workout, its picker or Finish is on screen", () => {
    for (const screen of ["/workout", "/workout/add-exercise", "/workout/finish"]) {
      expect(showsResumePill(workout, screen)).toBe(false);
    }
  });
});
