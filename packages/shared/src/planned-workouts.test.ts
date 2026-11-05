import { describe, expect, it } from "vitest";
import { PlannedWorkout, SetTarget } from "./planned-workouts";

const plannedWorkout = {
  id: "3b241101-e2bb-4255-8caf-4136c566a962",
  status: "current",
  weekStart: "2026-11-02",
  createdAt: "2026-11-04T09:00:00.000Z",
  plannedExercises: [{ slug: "goblet-squat", sets: 3, target: { unit: "kg", kg: 20, reps: 8 } }],
};

describe("SetTarget", () => {
  it.each([
    ["a load for reps", { unit: "kg", kg: 22.5, reps: 8 }],
    ["reps", { unit: "reps", reps: 12 }],
    ["seconds", { unit: "seconds", seconds: 40 }],
    ["a band level and reps", { unit: "band", level: "medium", reps: 12 }],
  ])("parses %s", (_name, target) => {
    expect(SetTarget.safeParse(target).success).toBe(true);
  });

  it("refuses unrounded seconds, which no Set could log", () => {
    expect(SetTarget.safeParse({ unit: "seconds", seconds: 40.4 }).success).toBe(false);
  });
});

describe("PlannedWorkout", () => {
  it.each(["current", "finished", "replaced"])("parses a plan that is %s", (status) => {
    expect(PlannedWorkout.safeParse({ ...plannedWorkout, status }).success).toBe(true);
  });

  it("refuses a week that isn't a date", () => {
    expect(PlannedWorkout.safeParse({ ...plannedWorkout, weekStart: "2026-W45" }).success).toBe(false);
  });

  it("refuses a plan with no Exercises", () => {
    expect(PlannedWorkout.safeParse({ ...plannedWorkout, plannedExercises: [] }).success).toBe(false);
  });
});
