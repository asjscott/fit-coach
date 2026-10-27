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
    const sections = workingLevelSections(levels, dumbbells, patterns);

    // No barbell, so no back squat
    expect(sections.map((s) => [s.pattern, s.workingLevels.map((l) => l.slug)])).toEqual([
      ["squat", ["goblet-squat"]],
      ["push", ["push-up"]],
      ["carry", ["farmers-carry"]],
      ["core", ["plank"]],
    ]);
  });

  it("rounds kg to a dumbbell the profile has, the lighter on a tie, and seconds to whole ones", () => {
    const bySlug = Object.fromEntries(
      workingLevelSections(levels, dumbbells, patterns)
        .flatMap((s) => s.workingLevels)
        .map((l) => [l.slug, l]),
    );

    expect(bySlug["goblet-squat"]).toEqual({ slug: "goblet-squat", unit: "kg", kg: 12 });
    expect(bySlug["farmers-carry"]).toEqual({ slug: "farmers-carry", unit: "kg", kg: 20 });
    expect(bySlug.plank).toEqual({ slug: "plank", unit: "seconds", seconds: 45 });
    expect(bySlug["push-up"]).toEqual({ slug: "push-up", unit: "reps", reps: 12 });
  });

  it("marks a section estimated when the Pattern it follows from wasn't tested: carry follows hinge", () => {
    const sections = workingLevelSections(levels, dumbbells, patterns);

    expect(sections.find((s) => s.pattern === "carry")?.estimated).toBe(true);
    expect(sections.find((s) => s.pattern === "squat")?.estimated).toBe(false);
  });
});
