import { loadInUnit, toKg, type EquipmentTag } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { EXERCISES } from "./data/exercises";
import {
  builtInEquipment,
  exerciseLoadsKg,
  isAvailable,
  isSafeFor,
  nextLoadKg,
  withLoadStepDefaults,
  type ProfileWithLoads,
} from "./equipment";

const exercise = (slug: string) => {
  const found = EXERCISES.find((e) => e.slug === slug);
  if (!found) throw new Error(`No exercise with slug "${slug}"`);
  return found;
};

const owning = (...tags: EquipmentTag[]) => ({ tags });

describe("isAvailable", () => {
  it("needs a bar or a table for an inverted row", () => {
    expect(isAvailable(exercise("inverted-row"), { tags: [] })).toBe(false);
    expect(isAvailable(exercise("inverted-row"), { tags: ["pull_up_bar"] })).toBe(true);
    expect(isAvailable(exercise("inverted-row"), { tags: ["table"] })).toBe(true);
  });

  it("makes a bodyweight exercise ([[]]) available with no equipment", () => {
    expect(isAvailable({ equipmentOptions: [[]] }, owning())).toBe(true);
    expect(isAvailable(exercise("push-up"), owning())).toBe(true);
  });

  it("makes a pull-up available with rings but no bar", () => {
    expect(isAvailable(exercise("pull-up"), owning("rings"))).toBe(true);
  });

  it("makes a back squat unavailable with a barbell but no rack", () => {
    expect(isAvailable(exercise("back-squat"), owning("barbell", "plates"))).toBe(false);
  });

  it("counts a power rack as a squat rack (IMPLIES)", () => {
    expect(isAvailable(exercise("back-squat"), owning("barbell", "plates", "power_rack"))).toBe(true);
  });
});

describe("isSafeFor", () => {
  it("rejects a squat for someone with a knee injury", () => {
    expect(isSafeFor(exercise("back-squat"), ["knee"])).toBe(false);
  });

  it("allows the same squat with no injuries", () => {
    expect(isSafeFor(exercise("back-squat"), [])).toBe(true);
  });
});

describe("exerciseLoadsKg", () => {
  const dumbbells: ProfileWithLoads = {
    tags: ["dumbbells"],
    loads: { dumbbells: { kind: "fixed", weightsKg: [16, 8, 12] } },
  };

  it("gives the loads the profile makes for the Exercise with this slug, lightest first", () => {
    expect(exerciseLoadsKg("goblet-squat", dumbbells)).toEqual([8, 12, 16]);
  });

  it("knows no loads for a slug not in the library, or without a profile", () => {
    expect(exerciseLoadsKg("not-in-the-library", dumbbells)).toEqual([]);
    expect(exerciseLoadsKg("goblet-squat", undefined)).toEqual([]);
  });
});

const lb = (pounds: number) => toKg(pounds, "lb");

// User story 22: one Load Step is the next load the Equipment Profile actually has
describe("nextLoadKg, one Load Step up or down", () => {
  const step = (slug: string, profile: ProfileWithLoads, kg: number, direction: 1 | -1) => {
    const next = nextLoadKg(exercise(slug), profile, kg, direction);
    return next === undefined ? undefined : loadInUnit(next, "lb");
  };

  it("steps to the next dumbbell in the list", () => {
    const profile: ProfileWithLoads = {
      tags: ["dumbbells"],
      loads: { dumbbells: { kind: "fixed", weightsKg: [lb(20), lb(25), lb(35)] } },
    };
    expect(step("goblet-squat", profile, lb(25), 1)).toBe(35);
    expect(step("goblet-squat", profile, lb(25), -1)).toBe(20);
  });

  it("steps adjustable dumbbells by their step, in pounds exactly", () => {
    const profile: ProfileWithLoads = {
      tags: ["dumbbells"],
      loads: { dumbbells: { kind: "adjustable", minKg: lb(5), maxKg: lb(100), stepKg: lb(5) } },
    };
    expect(step("goblet-squat", profile, lb(25), 1)).toBe(30);
    expect(step("goblet-squat", profile, lb(95), 1)).toBe(100);
    expect(step("goblet-squat", profile, lb(25), -1)).toBe(20);
  });

  it("steps a barbell by the lightest pair of pound plates", () => {
    const profile: ProfileWithLoads = {
      tags: ["barbell", "plates", "power_rack"],
      loads: { barbell: { barKg: lb(45), platesKg: [lb(45), lb(25), lb(10), lb(5), lb(2.5)] } },
    };
    expect(step("back-squat", profile, lb(135), 1)).toBe(140);
    expect(step("back-squat", profile, lb(45), 1)).toBe(50);
    expect(step("back-squat", profile, lb(135), -1)).toBe(130);
  });

  it("steps kettlebells to the next bell", () => {
    const profile: ProfileWithLoads = { tags: ["kettlebells"], loads: { kettlebells: { weightsKg: [12, 16, 24] } } };
    expect(nextLoadKg(exercise("goblet-squat"), profile, 16, 1)).toBe(24);
  });

  it("steps from a load between two the profile has to the next one it has", () => {
    const profile: ProfileWithLoads = { tags: ["kettlebells"], loads: { kettlebells: { weightsKg: [12, 16, 24] } } };
    expect(nextLoadKg(exercise("goblet-squat"), profile, 18, 1)).toBe(24);
    expect(nextLoadKg(exercise("goblet-squat"), profile, 18, -1)).toBe(16);
  });

  it("has no step past the heaviest or lightest load, or when the profile lists no loads", () => {
    const profile: ProfileWithLoads = { tags: ["kettlebells"], loads: { kettlebells: { weightsKg: [12, 16] } } };
    expect(nextLoadKg(exercise("goblet-squat"), profile, 16, 1)).toBeUndefined();
    expect(nextLoadKg(exercise("goblet-squat"), profile, 12, -1)).toBeUndefined();
    expect(nextLoadKg(exercise("goblet-squat"), { tags: ["kettlebells"], loads: {} }, 16, 1)).toBeUndefined();
  });

  // User story 23
  it("steps a cable by the profile's stored step", () => {
    const profile: ProfileWithLoads = { tags: ["cable_machine"], loads: { cable_machine: { stepKg: lb(10) } } };
    expect(step("lat-pulldown", profile, lb(100), 1)).toBe(110);
    expect(step("lat-pulldown", profile, lb(100), -1)).toBe(90);
  });
});

// User story 20: Full gym's built-in loads follow the user's unit
describe("builtInEquipment, Full gym in the user's unit", () => {
  const inLb = (slug: string) =>
    exerciseLoadsKg(slug, builtInEquipment("full_gym", "lb")).map((kg) => loadInUnit(kg, "lb"));
  const inKg = (slug: string) => exerciseLoadsKg(slug, builtInEquipment("full_gym", "kg"));

  it("has dumbbells from 5 to 100 lb in 5s in pounds", () => {
    expect(inLb("dumbbell-lateral-raise")).toEqual(Array.from({ length: 20 }, (_, i) => 5 * (i + 1)));
  });

  it("has a 45 lb bar loaded with pound plates in pounds", () => {
    expect(inLb("back-squat").slice(0, 4)).toEqual([45, 50, 55, 60]);
    expect(inLb("back-squat")).toContain(135);
    expect(inLb("back-squat")).toContain(225);
  });

  it("keeps its kg loads in kg", () => {
    expect(inKg("dumbbell-lateral-raise")).toEqual(Array.from({ length: 20 }, (_, i) => 2.5 * (i + 1)));
    expect(inKg("back-squat").slice(0, 3)).toEqual([20, 22.5, 25]);
  });

  it("steps its cables 10 lb in pounds and 5 kg in kg", () => {
    expect(inLb("lat-pulldown").slice(0, 3)).toEqual([10, 20, 30]);
    expect(inKg("lat-pulldown").slice(0, 3)).toEqual([5, 10, 15]);
  });

  it("has nothing on Bodyweight only", () => {
    expect(builtInEquipment("bodyweight_only", "lb")).toEqual({ tags: [], loads: {} });
  });
});

// User stories 21 and 23: a profile's cable and machine step is 10 lb or 5 kg until the user sets one
describe("withLoadStepDefaults", () => {
  const cable: ProfileWithLoads = { tags: ["cable_machine"], loads: {} };

  it("gives a cable or machine with no stored step 10 lb in pounds and 5 kg in kg", () => {
    expect(withLoadStepDefaults(cable, "lb").loads.cable_machine).toEqual({ stepKg: lb(10) });
    expect(withLoadStepDefaults(cable, "kg").loads.cable_machine).toEqual({ stepKg: 5 });
  });

  it("keeps a step the user set", () => {
    const set: ProfileWithLoads = { ...cable, loads: { cable_machine: { stepKg: lb(15) } } };
    expect(withLoadStepDefaults(set, "kg")).toEqual(set);
  });

  it("adds no step to a profile without a cable or machine", () => {
    const dumbbells: ProfileWithLoads = { tags: ["dumbbells"], loads: {} };
    expect(withLoadStepDefaults(dumbbells, "lb")).toEqual(dumbbells);
  });
});
