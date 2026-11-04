import type { Assessment, WorkingLevel } from "@fit/shared";
import { describe, expect, it } from "vitest";
import type { ProfileWithLoads } from "./equipment";
import { workingLevelSections } from "./working-level-sections";

const dumbbells: ProfileWithLoads = {
  tags: ["dumbbells"],
  loads: { dumbbells: { kind: "fixed", weightsKg: [8, 10, 12, 14, 16, 20] } },
};

const test = (slug: string) => ({
  slug,
  topSet: { kind: "timed" as const, seconds: 60, loggedAt: "2026-10-24T09:00:00.000Z" },
  maximum: 60,
  loadLimited: false,
  referenceStrength: 60,
  estimated: false as const,
});

// Hinge wasn't tested
const patterns: Assessment["patterns"] = {
  squat: test("goblet-squat"),
  hinge: { referenceStrength: 50, estimated: true },
  push: test("push-up"),
  core: test("plank"),
};

const levels: WorkingLevel[] = [
  { slug: "plank", unit: "seconds", seconds: 44.6 },
  { slug: "farmers-carry", unit: "kg", kg: 18.3 },
  { slug: "goblet-squat", unit: "kg", kg: 13 },
  { slug: "push-up", unit: "reps", reps: 12 },
  { slug: "back-squat", unit: "kg", kg: 40 },
];

describe("workingLevelSections", () => {
  it("groups the Working Levels the profile supports by Pattern, in Pattern order", () => {
    const sections = workingLevelSections(levels, dumbbells, patterns, []);

    // No barbell, so no back squat
    expect(sections.map((s) => [s.pattern, s.workingLevels.map((l) => l.slug)])).toEqual([
      ["squat", ["goblet-squat"]],
      ["push", ["push-up"]],
      ["carry", ["farmers-carry"]],
      ["core", ["plank"]],
    ]);
  });

  it("leaves out what an injury rules out", () => {
    const sections = workingLevelSections(levels, dumbbells, patterns, ["wrist"]);

    // Push-up is flagged for wrists, and it was the only push here
    expect(sections.map((s) => s.pattern)).toEqual(["squat", "carry", "core"]);
  });

  it("rounds kg to a dumbbell the profile has, the lighter on a tie, and seconds to whole ones", () => {
    const bySlug = Object.fromEntries(
      workingLevelSections(levels, dumbbells, patterns, [])
        .flatMap((s) => s.workingLevels)
        .map((l) => [l.slug, l]),
    );

    expect(bySlug["goblet-squat"]).toEqual({ slug: "goblet-squat", unit: "kg", kg: 12 });
    expect(bySlug["farmers-carry"]).toEqual({ slug: "farmers-carry", unit: "kg", kg: 20 });
    expect(bySlug.plank).toEqual({ slug: "plank", unit: "seconds", seconds: 45 });
    expect(bySlug["push-up"]).toEqual({ slug: "push-up", unit: "reps", reps: 12 });
  });

  describe("with a barbell and no loads known", () => {
    const gym: ProfileWithLoads = { tags: ["barbell", "plates", "squat_rack", "dumbbells"], loads: {} };
    const kgOf = (slug: string, kg: number, profile: ProfileWithLoads) =>
      workingLevelSections([{ slug, unit: "kg", kg }], profile, patterns, []).flatMap((s) => s.workingLevels)[0];

    it("never goes lighter than a 20 kg bar", () => {
      expect(kgOf("back-squat", 7, gym)).toEqual({ slug: "back-squat", unit: "kg", kg: 20 });
    });

    it("still rounds to the nearest 0.5 kg above the bar", () => {
      expect(kgOf("back-squat", 62.3, gym)).toEqual({ slug: "back-squat", unit: "kg", kg: 62.5 });
    });

    it("leaves an Exercise that needs no bar alone", () => {
      expect(kgOf("goblet-squat", 7, gym)).toEqual({ slug: "goblet-squat", unit: "kg", kg: 7 });
    });

    it("goes by the profile's own bar once the loads are known", () => {
      const lightBar: ProfileWithLoads = {
        tags: ["barbell", "plates", "squat_rack"],
        loads: { barbell: { barKg: 15, platesKg: [5] } },
      };

      expect(kgOf("back-squat", 7, lightBar)).toEqual({ slug: "back-squat", unit: "kg", kg: 15 });
    });
  });

  it("marks a section estimated when the Pattern it follows from wasn't tested: carry follows hinge", () => {
    const sections = workingLevelSections(levels, dumbbells, patterns, []);

    expect(sections.find((s) => s.pattern === "carry")?.estimated).toBe(true);
    expect(sections.find((s) => s.pattern === "squat")?.estimated).toBe(false);
  });
});
