import { toKg } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { exerciseBySlug } from "./data/exercises";
import { builtInEquipment, type ProfileWithLoads } from "./equipment";
import { repRange, seedWorkingLevels, workingLevelsOn } from "./working-levels";

// Story 28, ADR 0007: each kind of lift is trained in its own range, which progression (#132) climbs within
describe("repRange", () => {
  it.each([
    ["a dumbbell lift", "goblet-squat", "kg", { min: 8, max: 12 }],
    ["a cable lift", "lat-pulldown", "kg", { min: 8, max: 12 }],
    ["a barbell lift", "back-squat", "kg", { min: 6, max: 10 }],
    ["a landmine press, which needs a barbell too", "landmine-press", "kg", { min: 6, max: 10 }],
    ["a Ballistic Exercise, a fixed 8", "kettlebell-swing", "kg", { min: 8, max: 8 }],
    ["a band Exercise", "band-row", "band", { min: 10, max: 15 }],
    ["a weighted Exercise done with bands only", "dumbbell-lateral-raise", "band", { min: 10, max: 15 }],
  ] as const)("gives %s its range", (_, slug, unit, range) => {
    expect(repRange(exerciseBySlug(slug)!, unit)).toEqual(range);
  });

  it.each([
    ["a carry, whose reps mean nothing", "farmers-carry", "kg"],
    ["a bodyweight Exercise, which climbs its ladder to 15", "push-up", "reps"],
    ["a timed Exercise", "plank", "seconds"],
  ] as const)("gives %s no range", (_, slug, unit) => {
    expect(repRange(exerciseBySlug(slug)!, unit)).toBeNull();
  });
});

// #155: a Working Level is seeded on the Exercise's preferred kind of equipment, its first way of doing it that a
// profile owns with loads, so its Load Steps (#149) stay on that kind
describe("seedWorkingLevels", () => {
  const fullGymInLb = builtInEquipment("full_gym", "lb");
  const seededKg = (
    slug: string,
    referenceStrengths: Parameters<typeof seedWorkingLevels>[0]["referenceStrengths"],
  ) => {
    const level = seedWorkingLevels({ referenceStrengths, bodyWeightKg: 80, equipmentProfiles: [fullGymInLb] }).find(
      (each) => each.slug === slug,
    );
    return level?.unit === "kg" ? level.kg : undefined;
  };

  // A pull of 73 kg puts Renegade row's target near 18 lb: between the 15 and 20 lb dumbbells, above the 8 kg bell
  it("seeds Renegade row on a dumbbell, not a lighter kettlebell between two dumbbell steps", () => {
    expect(seededKg("renegade-row", { pull: 73 })).toBeCloseTo(toKg(15, "lb"));
  });

  // A hinge of 100 kg puts its target at 15 kg
  it("seeds a single-arm kettlebell swing on a kettlebell", () => {
    expect(seededKg("single-arm-kettlebell-swing", { hinge: 100 })).toBe(12);
  });

  it("falls back to another kind when the preferred kind has nothing as light as the target", () => {
    const heavyDumbbellsLightBells: ProfileWithLoads = {
      tags: ["dumbbells", "kettlebells"],
      loads: { dumbbells: { kind: "fixed", weightsKg: [20, 25] }, kettlebells: { weightsKg: [4, 8, 12] } },
    };
    const [level] = seedWorkingLevels({
      referenceStrengths: { pull: 73 },
      bodyWeightKg: 80,
      equipmentProfiles: [heavyDumbbellsLightBells],
    }).filter((each) => each.slug === "renegade-row");
    expect(level).toMatchObject({ unit: "kg", kg: 8 });
  });
});

// A profile added since the Assessment has its Working Levels worked out as the Assessment would have seeded them
describe("workingLevelsOn", () => {
  it("works out Renegade row on a lb Full gym added since on a dumbbell", () => {
    const levels = workingLevelsOn({
      workingLevels: [],
      assessment: { bodyWeightKg: 80, patterns: { pull: { referenceStrength: 73, estimated: true } } },
      equipmentProfile: builtInEquipment("full_gym", "lb"),
    });
    const level = levels.get("renegade-row");
    expect(level?.unit === "kg" && level.kg).toBeCloseTo(toKg(15, "lb"));
  });
});
