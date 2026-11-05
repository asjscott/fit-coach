import { describe, expect, it } from "vitest";
import { todayPlan, todayRestDay, todayState, todayStatus } from "./today-status";

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

describe("todayState", () => {
  it("is loading until History arrives", () => {
    expect(todayState({ historyLoaded: false, failed: false, workoutCount: 0 })).toBe("loading");
  });

  it("is offline when History couldn't load", () => {
    expect(todayState({ historyLoaded: false, failed: true, workoutCount: 1 })).toBe("offline");
  });

  it("is a first run when there are no Workouts at all", () => {
    expect(todayState({ historyLoaded: true, failed: false, workoutCount: 0 })).toBe("first-run");
  });

  it("is loaded once History arrives with Workouts, Pending ones included", () => {
    expect(todayState({ historyLoaded: true, failed: false, workoutCount: 1 })).toBe("loaded");
  });
});

describe("todayPlan", () => {
  const settled = { isLoaded: true, workoutInProgress: false, hasPlan: true, stale: false };

  it("shows a plan the phone has no reason to doubt", () => {
    expect(todayPlan(settled)).toBe("planned");
  });

  it("asks for a connection in place of a stale plan", () => {
    expect(todayPlan({ ...settled, stale: true })).toBe("connect");
  });

  it("offers nothing during a Workout, stale or not", () => {
    expect(todayPlan({ ...settled, workoutInProgress: true })).toBe("none");
    expect(todayPlan({ ...settled, workoutInProgress: true, stale: true })).toBe("none");
  });

  it("offers nothing until the Logbook has loaded, or without a plan", () => {
    expect(todayPlan({ ...settled, isLoaded: false })).toBe("none");
    expect(todayPlan({ ...settled, hasPlan: false })).toBe("none");
  });
});

describe("todayRestDay", () => {
  const now = new Date(2026, 10, 4, 18);
  const finishedOffline = [
    {
      startedAt: new Date(2026, 10, 4, 7).toISOString(),
      endedAt: new Date(2026, 10, 4, 8).toISOString(),
      workoutExercises: [],
    },
  ];

  it("recommends a Rest Day after a Workout finished offline, above the line asking for a connection", () => {
    expect(todayRestDay("connect", finishedOffline, now, 4)).toBe("trained-today");
  });

  it("recommends a Rest Day above the Planned Workout", () => {
    expect(todayRestDay("planned", finishedOffline, now, 4)).toBe("trained-today");
  });

  it("stays quiet with nothing on offer to sit above", () => {
    expect(todayRestDay("none", finishedOffline, now, 4)).toBeNull();
  });
});
