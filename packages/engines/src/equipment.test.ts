import type { EquipmentTag } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { EXERCISES } from "./data/exercises";
import { isAvailable, isSafeFor } from "./equipment";

const exercise = (slug: string) => {
  const found = EXERCISES.find((e) => e.slug === slug);
  if (!found) throw new Error(`No exercise with slug "${slug}"`);
  return found;
};

const owning = (...tags: EquipmentTag[]) => ({ tags });

describe("isAvailable", () => {
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
