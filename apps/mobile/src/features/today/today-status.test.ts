import { describe, expect, it } from "vitest";
import { assessmentOffer, todayState, todayStatus } from "./today-status";

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

describe("assessmentOffer", () => {
  const workout = (id: string, startedAt: string, assessment?: "A" | "B") => ({
    id,
    startedAt: `2026-10-${startedAt}T09:00:00.000Z`,
    ...(assessment && { assessment }),
  });

  it("offers A to a user who hasn't done one", () => {
    expect(assessmentOffer({ workouts: [workout("w1", "20")], latestAssessment: null })).toEqual({
      kind: "start",
      part: "A",
    });
  });

  it("offers A to a user with no Workouts at all", () => {
    expect(assessmentOffer({ workouts: [], latestAssessment: null })).toEqual({ kind: "start", part: "A" });
  });

  it("offers B once A is done, until a B follows it", () => {
    const workouts = [workout("w2", "21"), workout("a1", "20", "A")];
    expect(assessmentOffer({ workouts, latestAssessment: null })).toEqual({ kind: "start", part: "B" });
  });

  it("doesn't count a B from before the latest A", () => {
    const workouts = [workout("a2", "22", "A"), workout("b1", "21", "B"), workout("a1", "20", "A")];
    expect(assessmentOffer({ workouts, latestAssessment: { aWorkoutId: "a1" } })).toEqual({
      kind: "start",
      part: "B",
    });
  });

  it("links to the Results once the Assessment is on the server", () => {
    const workouts = [workout("b1", "22", "B"), workout("a1", "20", "A")];
    expect(assessmentOffer({ workouts, latestAssessment: { aWorkoutId: "a1" } })).toEqual({ kind: "results" });
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
