import type { InjuryTag } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { builtInEquipment, NO_EQUIPMENT } from "./equipment";
import { recoveryWorkoutFor, RECOVERY_WORKOUT, takesAnotherSet } from "./recovery-workout";

// Story 30 of #195: a hold the user can't do is replaced by one they can
describe("recoveryWorkoutFor", () => {
  const slugsFor = (...injuries: InjuryTag[]) =>
    recoveryWorkoutFor({ equipmentProfile: NO_EQUIPMENT, injuries }).map(({ slug }) => slug);

  it("is the walk and the four holds as they are with nothing ruled out", () => {
    const equipmentProfile = builtInEquipment("full_gym", "kg");
    expect(recoveryWorkoutFor({ equipmentProfile, injuries: [] })).toEqual(RECOVERY_WORKOUT);
    expect(recoveryWorkoutFor({ equipmentProfile, injuries: ["ankle"] })).toEqual(RECOVERY_WORKOUT);
  });

  it("replaces only the hold ruled out, in its place, by one for a Muscle it stretches", () => {
    // Open book, the only one of the four avoided with a shoulder injury
    expect(slugsFor("shoulder")).toEqual([
      "walk",
      "hip-flexor-stretch",
      expect.not.stringMatching(/^(open-book|thread-the-needle|wall-slides|foam-roll-upper-back)$/),
      "cat-cow",
      "worlds-greatest-stretch",
    ]);
  });

  it("replaces several without giving one twice", () => {
    const workout = recoveryWorkoutFor({ equipmentProfile: NO_EQUIPMENT, injuries: ["knee"] });
    const slugs = workout.map(({ slug }) => slug);
    expect(slugs).toEqual(["walk", "figure-four", "open-book", "lying-spinal-twist", "seated-forward-fold"]);
    expect(new Set(slugs).size).toBe(5);
  });

  it("holds a replacement for 2 × 45 s, as Walk and mobility keeps its Sets", () => {
    const [, , , , last] = recoveryWorkoutFor({ equipmentProfile: NO_EQUIPMENT, injuries: ["hip", "knee"] });
    expect(last).toMatchObject({ slug: "lying-hamstring-stretch", sets: 2, target: { unit: "seconds", seconds: 45 } });
    const [, standIn] = recoveryWorkoutFor({ equipmentProfile: NO_EQUIPMENT, injuries: ["hip"] });
    expect(standIn).toEqual({ slug: "standing-quad-stretch", sets: 2, target: { unit: "seconds", seconds: 45 } });
  });

  it("rolls only with a foam roller", () => {
    const withRoller = { ...NO_EQUIPMENT, tags: ["foam_roller" as const] };
    const slugs = recoveryWorkoutFor({ equipmentProfile: withRoller, injuries: ["shoulder"] }).map(({ slug }) => slug);
    expect(slugs[2]).toBe("foam-roll-upper-back");
    expect(slugsFor("shoulder")).not.toContain("foam-roll-upper-back");
  });

  it("drops a hold when every other is ruled out too", () => {
    expect(slugsFor("neck", "shoulder", "elbow", "wrist", "lower_back", "hip", "knee", "ankle")).toEqual([
      "walk",
      "lying-hamstring-stretch",
      "knees-to-chest",
    ]);
  });
});

describe("takesAnotherSet", () => {
  const sets = (count: number) => Array.from({ length: count }, () => ({}));

  it("takes the walk's one Set and no Set 2", () => {
    expect(takesAnotherSet({ slug: "walk", sets: sets(0) })).toBe(true);
    expect(takesAnotherSet({ slug: "walk", sets: sets(1) })).toBe(false);
  });

  it("lets the stretches and every other Exercise go past their target", () => {
    expect(takesAnotherSet({ slug: "cat-cow", sets: sets(2) })).toBe(true);
    expect(takesAnotherSet({ slug: "goblet-squat", sets: sets(5) })).toBe(true);
  });
});
