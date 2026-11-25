import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHT_UNIT, fromKg, inUnitToStep, KG_PER_LB, loadInUnit, toKg, WeightUnit } from "./units";

// User stories 18 and 19: the user picks pounds or kilograms, and a load entered in pounds always reads back as entered
describe("WeightUnit", () => {
  it("is lb or kg, lb by default", () => {
    expect(WeightUnit.options).toEqual(["lb", "kg"]);
    expect(DEFAULT_WEIGHT_UNIT).toBe("lb");
  });
});

describe("toKg", () => {
  it("stores a load entered in pounds as its exact kg, never rounded", () => {
    expect(KG_PER_LB).toBe(0.45359237);
    expect(toKg(25, "lb")).toBeCloseTo(11.33980925, 12);
    expect(toKg(45, "lb")).toBeCloseTo(20.41165665, 12);
  });

  it("passes a load entered in kilograms through as it is", () => {
    expect(toKg(12.5, "kg")).toBe(12.5);
  });
});

describe("loadInUnit", () => {
  it("shows a load entered in pounds back as entered: 25 lb never reads 24.9", () => {
    for (const lb of [2.5, 5, 25, 45, 52.5, 100, 135, 225, 315, 405]) {
      expect(loadInUnit(toKg(lb, "lb"), "lb")).toBe(lb);
    }
  });

  it("shows a load sized in the user's unit as it is", () => {
    expect(loadInUnit(toKg(5.75, "lb"), "lb")).toBe(5.75);
    expect(loadInUnit(16.25, "kg")).toBe(16.25);
    expect(loadInUnit(16.8, "kg")).toBe(16.8);
    expect(loadInUnit(0.1 + 0.2, "kg")).toBe(0.3);
  });

  it("rounds one sized in the other unit to 0.5", () => {
    expect(loadInUnit(20, "lb")).toBe(44); // 44.09 lb
    expect(loadInUnit(12.5, "lb")).toBe(27.5); // 27.56 lb
    expect(loadInUnit(toKg(37, "lb"), "kg")).toBe(17); // 16.78 kg
    expect(loadInUnit(22.5, "kg")).toBe(22.5);
  });
});

describe("fromKg", () => {
  it("converts kg into the user's unit unrounded, for totals such as Volume", () => {
    expect(fromKg(1000, "lb")).toBeCloseTo(2204.6226, 4);
    expect(fromKg(1000, "kg")).toBe(1000);
  });
});

describe("inUnitToStep", () => {
  it("gives kg in the user's unit to the nearest step", () => {
    expect(inUnitToStep(80, "lb", 0.1)).toBe(176.4); // 176.37 lb
    expect(inUnitToStep(20, "lb", 0.5)).toBe(44); // 44.09 lb
    expect(inUnitToStep(16.84, "kg", 0.1)).toBe(16.8);
  });

  it("reads a weight entered in pounds back as entered, at any step", () => {
    expect(inUnitToStep(toKg(165.5, "lb"), "lb", 0.5)).toBe(165.5);
    expect(inUnitToStep(toKg(176.4, "lb"), "lb", 0.1)).toBe(176.4);
  });
});
