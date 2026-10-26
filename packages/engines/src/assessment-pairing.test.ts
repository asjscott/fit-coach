import type { AssessmentPart } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { pairToAssess } from "./assessment-pairing";

const workout = (id: string, day: string, assessment: AssessmentPart) => ({
  id,
  startedAt: `2026-10-${day}T09:00:00.000Z`,
  assessment,
});

describe("pairToAssess", () => {
  it("pairs a B with the latest A before it", () => {
    const a1 = workout("a1", "01", "A");
    const a2 = workout("a2", "10", "A");
    const b = workout("b", "12", "B");
    expect(pairToAssess(b, { workouts: [a1, a2, b], assessments: [] })).toEqual({ aWorkoutId: "a2", bWorkoutId: "b" });
  });

  it("pairs an A that arrives after its B, when they synced out of order", () => {
    const a = workout("a", "10", "A");
    const b = workout("b", "12", "B");
    expect(pairToAssess(a, { workouts: [b, a], assessments: [] })).toEqual({ aWorkoutId: "a", bWorkoutId: "b" });
  });

  it("doesn't pair an A that arrives late when a later A sits between it and the B", () => {
    const a1 = workout("a1", "01", "A");
    const a2 = workout("a2", "10", "A");
    const b = workout("b", "12", "B");
    expect(pairToAssess(a1, { workouts: [a2, b, a1], assessments: [] })).toBeNull();
  });

  it("leaves a B unpaired when its A was deleted before it arrived", () => {
    // a2, between b1 and b2, was deleted; a1 already went with b1
    const a1 = workout("a1", "01", "A");
    const b1 = workout("b1", "02", "B");
    const b2 = workout("b2", "12", "B");
    expect(
      pairToAssess(b2, { workouts: [a1, b1, b2], assessments: [{ aWorkoutId: "a1", bWorkoutId: "b1" }] }),
    ).toBeNull();
  });

  it("makes no new Assessment when the same B is posted again", () => {
    const a = workout("a", "10", "A");
    const b = workout("b", "12", "B");
    expect(pairToAssess(b, { workouts: [a, b], assessments: [{ aWorkoutId: "a", bWorkoutId: "b" }] })).toBeNull();
  });
});
