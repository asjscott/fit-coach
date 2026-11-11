import { toKg } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { loadTagsAsked, toEquipmentInput } from "./training-setup";

// User story 23: each Equipment Profile with a cable or machine has a step the user can set
describe("the weights a training setup asks for", () => {
  it("asks a gym only for its cable and machine step, as the Coach knows a gym's other weights", () => {
    expect(loadTagsAsked("gym", ["dumbbells", "cable_machine"])).toEqual(["cable_machine"]);
  });

  it("asks a home for the weights of everything selected", () => {
    expect(loadTagsAsked("home", ["dumbbells", "cable_machine"])).toEqual(["dumbbells", "cable_machine"]);
  });

  it("asks bodyweight and no equipment for nothing", () => {
    expect(loadTagsAsked("bodyweight", ["pull_up_bar"])).toEqual([]);
    expect(loadTagsAsked("none", [])).toEqual([]);
  });

  it("saves a gym's cable and machine step and nothing else", () => {
    const loads = { cable_machine: { step: 15 }, dumbbells: { kind: "fixed" as const, weights: ["20"] } };
    expect(toEquipmentInput("gym", {}, loads, "lb").loads).toEqual({ cable_machine: { stepKg: toKg(15, "lb") } });
  });
});
