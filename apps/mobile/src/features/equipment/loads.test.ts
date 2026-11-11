import { toKg } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { loadOptions, toLoads, toLoadsForm } from "./loads";

const tags = ["dumbbells", "kettlebells", "barbell", "plates"] as const;

// User stories 18 and 19: an Equipment Profile's loads are entered and shown in the user's unit, stored in kg
describe("an Equipment Profile's loads in the user's unit", () => {
  it("stores loads entered in pounds as their exact kg", () => {
    const loads = toLoads(
      {
        dumbbells: { kind: "fixed", weights: ["25", "20"] },
        kettlebells: { weights: ["35"] },
        barbell: { bar: "45", plates: ["45", "2.5"] },
      },
      [...tags],
      "lb",
    );
    expect(loads).toEqual({
      dumbbells: { kind: "fixed", weightsKg: [toKg(20, "lb"), toKg(25, "lb")] },
      kettlebells: { weightsKg: [toKg(35, "lb")] },
      barbell: { barKg: toKg(45, "lb"), platesKg: [toKg(2.5, "lb"), toKg(45, "lb")] },
    });
  });

  it("stores adjustable dumbbells entered in pounds as their exact kg", () => {
    const form = { dumbbells: { kind: "adjustable" as const, min: 5, max: 50, step: 2.5 } };
    expect(toLoads(form, ["dumbbells"], "lb").dumbbells).toEqual({
      kind: "adjustable",
      minKg: toKg(5, "lb"),
      maxKg: toKg(50, "lb"),
      stepKg: toKg(2.5, "lb"),
    });
  });

  it("shows loads entered in pounds back as entered", () => {
    const form = {
      dumbbells: { kind: "fixed" as const, weights: ["20", "25"] },
      barbell: { bar: "45", plates: ["2.5", "45"] },
    };
    expect(toLoadsForm(toLoads(form, [...tags], "lb"), "lb")).toMatchObject(form);
  });

  it("keeps kg loads such as 1.25 kg plates as they are", () => {
    const form = { barbell: { bar: "20", plates: ["1.25", "2.5", "20"] } };
    expect(toLoadsForm(toLoads(form, [...tags], "kg"), "kg")).toMatchObject(form);
  });

  it("offers pound sizes in pounds and kg sizes in kg", () => {
    expect(loadOptions("lb").bar).toEqual([15, 25, 35, 45]);
    expect(loadOptions("lb").plates).toContain(45);
    expect(loadOptions("kg").bar).toEqual([7, 10, 15, 20]);
    expect(loadOptions("kg").plates).toContain(1.25);
  });
});
