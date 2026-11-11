import type { Set } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { offersLastSetRpe, withRpe } from "./last-set-rpe";

const loggedAt = "2026-11-04T18:10:00.000Z";
const lifted = (rpe?: number): Set => ({ kind: "external", kg: 14, reps: 8, ...(rpe && { rpe }), loggedAt });
const squat = (sets: Set[], plannedSets?: number) => ({
  slug: "goblet-squat",
  sets,
  ...(plannedSets && { planned: { sets: plannedSets, target: { unit: "kg" as const, kg: 14, reps: 8 } } }),
});

// Story 43, #133: the phone offers an optional RPE after each Exercise's last Set
describe("offersLastSetRpe", () => {
  it("offers it once a planned Exercise has its Sets, not before", () => {
    expect(offersLastSetRpe({}, squat([lifted(), lifted()], 3))).toBe(false);
    expect(offersLastSetRpe({}, squat([lifted(), lifted(), lifted()], 3))).toBe(true);
  });

  it("keeps offering it on a Set past the plan, which becomes the last", () => {
    expect(offersLastSetRpe({}, squat([lifted(), lifted(), lifted(), lifted()], 3))).toBe(true);
  });

  it("offers it after each Set of an Exercise with no plan, since any Set may be the last", () => {
    expect(offersLastSetRpe({}, squat([lifted()]))).toBe(true);
  });

  it("doesn't offer it before the first Set", () => {
    expect(offersLastSetRpe({}, squat([]))).toBe(false);
  });

  it("leaves an Assessment Workout's RPE to its tests, which ask on every Set", () => {
    expect(offersLastSetRpe({ assessment: "A" }, squat([lifted(), lifted(), lifted()], 3))).toBe(false);
  });

  it("doesn't offer it on a Recovery Exercise", () => {
    const stretch = { slug: "cat-cow", sets: [{ kind: "timed" as const, seconds: 45, loggedAt }] };
    expect(offersLastSetRpe({}, stretch)).toBe(false);
  });
});

// Story 45: rating the last Set is one tap, and tapping the chosen RPE again takes it off
describe("withRpe", () => {
  it("rates a Set, keeping its values", () => {
    expect(withRpe(lifted(), 10)).toEqual({ kind: "external", kg: 14, reps: 8, rpe: 10 });
  });

  it("takes the RPE off", () => {
    expect(withRpe(lifted(9), undefined)).toEqual({ kind: "external", kg: 14, reps: 8 });
  });
});
