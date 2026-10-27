import { describe, expect, it } from "vitest";
import { EXERCISES } from "./data/exercises";
import { exerciseMaximum, referenceStrength, STRENGTH_RATIOS } from "./strength-ratios";

// Checks the hand-set ratio table against the library

describe("strength ratios", () => {
  it("has an entry for every library Exercise", () => {
    expect(EXERCISES.map((e) => e.slug).filter((slug) => !STRENGTH_RATIOS[slug])).toEqual([]);
  });

  it("has no entry for an Exercise that isn't in the library", () => {
    const slugs = new Set(EXERCISES.map((e) => e.slug));
    expect(Object.keys(STRENGTH_RATIOS).filter((slug) => !slugs.has(slug))).toEqual([]);
  });

  it("measures each Pattern's Reference Strength on its barbell lift (a pull-up's total load, plank seconds)", () => {
    for (const slug of ["back-squat", "deadlift", "barbell-bench-press", "pull-up", "plank"]) {
      expect(exerciseMaximum(slug, 100)).toBe(100);
    }
  });

  it("takes carry from hinge", () => {
    const carries = EXERCISES.filter((e) => e.patterns[0].pattern === "carry").map((e) => e.slug);
    expect(carries.length).toBeGreaterThan(0);
    for (const slug of carries) expect(STRENGTH_RATIOS[slug]).toMatchObject({ kind: "weighted", pattern: "hinge" });
  });

  it.each(
    Object.entries(STRENGTH_RATIOS)
      .filter(([, entry]) => "ratio" in entry)
      .map(([slug]) => slug),
  )("gives %s's maximum back from the Reference Strength it makes", (slug) => {
    expect(exerciseMaximum(slug, referenceStrength(slug, 42))).toBeCloseTo(42, 9);
  });

  it("refuses an Exercise the table can't scale", () => {
    expect(() => referenceStrength("band-row", 20)).toThrow();
    expect(() => referenceStrength("dead-bug", 20)).toThrow();
  });
});
