import { describe, expect, it } from "vitest";
import { EXERCISES } from "./data/exercises";
import { exerciseMaximum, referenceStrength, STRENGTH_RATIOS } from "./strength-ratios";

// Checks the hand-set ratio table against the library

describe("strength ratios", () => {
  it("has an entry for every library Exercise but the Recovery Exercises, which take no Working Level", () => {
    expect(
      EXERCISES.filter((e) => !e.recovery)
        .map((e) => e.slug)
        .filter((slug) => !STRENGTH_RATIOS[slug]),
    ).toEqual([]);
  });

  it("has no entry for an Exercise that isn't in the library, or a Recovery Exercise", () => {
    const slugs = new Set(EXERCISES.filter((e) => !e.recovery).map((e) => e.slug));
    expect(Object.keys(STRENGTH_RATIOS).filter((slug) => !slugs.has(slug))).toEqual([]);
  });

  it("measures each Pattern's Reference Strength on its barbell lift (a pull-up's total load, plank seconds)", () => {
    for (const slug of ["back-squat", "deadlift", "barbell-bench-press", "pull-up", "plank"]) {
      expect(exerciseMaximum(slug, 100)).toBe(100);
    }
  });

  it("takes carry from hinge", () => {
    const carries = EXERCISES.filter((e) => e.patterns[0]?.pattern === "carry").map((e) => e.slug);
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

  // Story 13 (#105): a jump's dose is contacts, set by its place on the ladder, not a Working Level
  it("gives each jump a fixed number of contacts a Set, about 48 a Workout and no more higher up the ladder", () => {
    const ladder = ["pogo-hop", "squat-jump", "countermovement-jump", "box-jump", "broad-jump", "lateral-bound"];
    const contacts = ladder.map((slug) => {
      const entry = STRENGTH_RATIOS[slug];
      return entry?.kind === "contacts" ? entry.contacts : undefined;
    });
    expect(contacts).toEqual([10, 8, 8, 6, 6, 6]);
  });

  it("refuses an Exercise the table can't scale", () => {
    expect(() => referenceStrength("band-row", 20)).toThrow();
    expect(() => referenceStrength("dead-bug", 20)).toThrow();
    expect(() => referenceStrength("squat-jump", 20)).toThrow();
  });
});
