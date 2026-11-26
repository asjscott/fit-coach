import type { AssessmentMarker } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { workoutsToAssess } from "./assessment-pairing";

const workout = (id: string, day: string, assessment: AssessmentMarker) => ({
  id,
  startedAt: `2026-10-${day}T09:00:00.000Z`,
  assessment,
});

describe("workoutsToAssess", () => {
  it("takes a single Assessment Workout by itself, once, leaving an unpaired A alone", () => {
    const a = workout("a", "10", "A");
    const single = workout("s", "12", "single");
    expect(workoutsToAssess(single, { workouts: [a, single], assessments: [] })).toEqual({ workoutIds: ["s"] });
    expect(workoutsToAssess(single, { workouts: [a, single], assessments: [{ workoutIds: ["s"] }] })).toBeNull();
  });

  it("still pairs an old A and B that arrive around a single Assessment Workout", () => {
    const a = workout("a", "10", "A");
    const single = workout("s", "11", "single");
    const b = workout("b", "12", "B");
    expect(workoutsToAssess(b, { workouts: [a, single, b], assessments: [{ workoutIds: ["s"] }] })).toEqual({
      workoutIds: ["a", "b"],
    });
  });

  it("pairs a B with the latest A before it", () => {
    const a1 = workout("a1", "01", "A");
    const a2 = workout("a2", "10", "A");
    const b = workout("b", "12", "B");
    expect(workoutsToAssess(b, { workouts: [a1, a2, b], assessments: [] })).toEqual({ workoutIds: ["a2", "b"] });
  });

  it("pairs an A that arrives after its B, when they synced out of order", () => {
    const a = workout("a", "10", "A");
    const b = workout("b", "12", "B");
    expect(workoutsToAssess(a, { workouts: [b, a], assessments: [] })).toEqual({ workoutIds: ["a", "b"] });
  });

  it("pairs a B with the latest A before it even when a B with no Assessment sits between them", () => {
    // b1's Assessment was never worked out
    const a = workout("a", "01", "A");
    const b1 = workout("b1", "03", "B");
    const b2 = workout("b2", "05", "B");
    expect(workoutsToAssess(b2, { workouts: [a, b1, b2], assessments: [] })).toEqual({ workoutIds: ["a", "b2"] });
  });

  it("pairs an A that arrives late with the first B after it that has no Assessment yet", () => {
    // b1 was paired with a0 before a reached the server
    const a0 = workout("a0", "01", "A");
    const a = workout("a", "10", "A");
    const b1 = workout("b1", "12", "B");
    const b2 = workout("b2", "14", "B");
    expect(workoutsToAssess(a, { workouts: [a0, b1, b2, a], assessments: [{ workoutIds: ["a0", "b1"] }] })).toEqual({
      workoutIds: ["a", "b2"],
    });
  });

  it("doesn't pair an A that arrives late when a later A sits between it and the B", () => {
    const a1 = workout("a1", "01", "A");
    const a2 = workout("a2", "10", "A");
    const b = workout("b", "12", "B");
    expect(workoutsToAssess(a1, { workouts: [a2, b, a1], assessments: [] })).toBeNull();
  });

  it("leaves a B unpaired when its A was deleted before it arrived", () => {
    // a2, between b1 and b2, was deleted; a1 already went with b1
    const a1 = workout("a1", "01", "A");
    const b1 = workout("b1", "02", "B");
    const b2 = workout("b2", "12", "B");
    expect(workoutsToAssess(b2, { workouts: [a1, b1, b2], assessments: [{ workoutIds: ["a1", "b1"] }] })).toBeNull();
  });

  it("makes no new Assessment when the same B is posted again", () => {
    const a = workout("a", "10", "A");
    const b = workout("b", "12", "B");
    expect(workoutsToAssess(b, { workouts: [a, b], assessments: [{ workoutIds: ["a", "b"] }] })).toBeNull();
  });
});
