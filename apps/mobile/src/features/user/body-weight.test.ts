import { toKg } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { bodyWeightAnswer, bodyWeightInUnit, bodyWeightKg } from "./body-weight";

// #148: body weight follows "Weights in" like every load, and is still stored in kg
describe("body weight in the user's unit", () => {
  it("shows a body weight entered in pounds back as entered", () => {
    expect(bodyWeightInUnit(toKg(180, "lb"), "lb")).toBe(180);
    expect(bodyWeightInUnit(toKg(165.5, "lb"), "lb")).toBe(165.5);
  });

  it("shows a body weight entered in kg in pounds, to a tenth", () => {
    expect(bodyWeightInUnit(80, "lb")).toBe(176.4);
  });

  it("shows a body weight entered in kg as entered", () => {
    expect(bodyWeightInUnit(80, "kg")).toBe(80);
    expect(bodyWeightInUnit(72.3, "kg")).toBe(72.3);
  });
});

describe("asking for body weight in the user's unit", () => {
  const error = (value: unknown, unit: "lb" | "kg") =>
    bodyWeightAnswer(unit).safeParse(value).error?.issues[0]?.message;

  it("takes a body weight in pounds that is within the kg range", () => {
    expect(error(180, "lb")).toBeUndefined();
    expect(error(78, "lb")).toBeUndefined();
    expect(error(551, "lb")).toBeUndefined();
  });

  it("says the range in pounds when a body weight in pounds is out of it", () => {
    expect(error(60, "lb")).toBe("Must be 78 lb or more");
    expect(error(600, "lb")).toBe("Must be 551 lb or less");
  });

  it("says the range in kg when a body weight in kg is out of it", () => {
    expect(error(80, "kg")).toBeUndefined();
    expect(error(30, "kg")).toBe("Must be 35 kg or more");
    expect(error(260, "kg")).toBe("Must be 250 kg or less");
  });

  it("asks for a body weight left blank", () => {
    expect(error(undefined, "lb")).toBe("Enter your weight");
  });
});

describe("saving a body weight answered in the user's unit", () => {
  it("stores a body weight answered in pounds as its exact kg", () => {
    expect(bodyWeightKg(180, "lb")).toBe(toKg(180, "lb"));
  });

  it("stores a body weight answered in kg as answered", () => {
    expect(bodyWeightKg(80, "kg")).toBe(80);
  });

  it("keeps the stored body weight when the answer shown for it is saved unchanged", () => {
    // 80 kg shows as 176.4 lb; saving that back would store 80.01 kg
    expect(bodyWeightKg(176.4, "lb", 80)).toBe(80);
  });

  it("stores a changed body weight in place of the stored one", () => {
    expect(bodyWeightKg(170, "lb", 80)).toBe(toKg(170, "lb"));
  });
});
