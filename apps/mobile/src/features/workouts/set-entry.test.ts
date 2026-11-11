import { describe, expect, it } from "vitest";
import type { StepDirection } from "@fit/engines";
import { toKg } from "@fit/shared";
import { draftValues, loadStep, loadStepLabel, rpeMissing, setDraft, stepValue } from "./set-entry";

describe("stepValue", () => {
  // Stands in for the next load: 10 a step, so it can't be mistaken for any other rule
  const byTen = (load: number, direction: StepDirection) => load + 10 * direction;

  it("steps reps by 1 and seconds by 5", () => {
    expect(stepValue("reps", "8", 1)).toBe("9");
    expect(stepValue("seconds", "45", -1)).toBe("40");
  });

  it("steps a load to the next load it's given", () => {
    expect(stepValue("load", "16", 1, byTen)).toBe("26");
    expect(stepValue("load", "16", -1, byTen)).toBe("6");
  });

  it("steps an empty field up from nothing", () => {
    expect(stepValue("load", "", 1, byTen)).toBe("10");
    expect(stepValue("reps", " ", 1)).toBe("1");
  });

  it("never goes below zero", () => {
    expect(stepValue("load", "1", -1, byTen)).toBe("0");
    expect(stepValue("reps", "", -1)).toBe("0");
    expect(stepValue("seconds", "3", -1)).toBe("0");
  });

  it("keeps a typed half load, read with a decimal comma or point", () => {
    expect(stepValue("load", "16.5", 1, byTen)).toBe("26.5");
    expect(stepValue("load", "16,5", -1, byTen)).toBe("6.5");
  });

  // User story 19: display rounds to 0.5 of the user's unit
  it("rounds a typed load to the nearest 0.5 before stepping", () => {
    expect(stepValue("load", "16.2", 1, byTen)).toBe("26");
    expect(stepValue("load", "16.3", 1, byTen)).toBe("26.5");
  });

  it("rounds typed reps and seconds to whole numbers", () => {
    expect(stepValue("reps", "8.6", 1)).toBe("10");
    expect(stepValue("seconds", "44.2", 1)).toBe("49");
  });

  it("starts again from nothing when the field isn't a number", () => {
    expect(stepValue("load", "abc", 1, byTen)).toBe("10");
  });
});

// User story 18: the load stepper works in the user's unit
describe("loadStep", () => {
  it("steps to the next load the equipment has, as the user sees it", () => {
    const dumbbells = [toKg(20, "lb"), toKg(25, "lb"), toKg(30, "lb")];
    expect(loadStep(dumbbells, "lb")(25, 1)).toBe(30);
    expect(loadStep(dumbbells, "lb")(25, -1)).toBe(20);
    expect(loadStep([10, 12.5, 15], "kg")(12.5, 1)).toBe(15);
  });

  it("never sticks on a load whose kg is a hair off the one shown", () => {
    expect(loadStep([12.5, 15], "lb")(27.5, 1)).toBe(33);
  });

  it("stays put past the lightest or heaviest load", () => {
    expect(loadStep([10, 12.5], "kg")(12.5, 1)).toBe(12.5);
    expect(loadStep([10, 12.5], "kg")(10, -1)).toBe(10);
  });

  it("steps by 5 lb or 2 kg when the loads aren't known", () => {
    expect(loadStep([], "lb")(25, 1)).toBe(30);
    expect(loadStep([], "kg")(16, -1)).toBe(14);
  });
});

describe("loadStepLabel", () => {
  it("names the next weight when the equipment's loads are known", () => {
    expect(loadStepLabel(1, true, "lb")).toBe("Next heavier weight");
    expect(loadStepLabel(-1, true, "kg")).toBe("Next lighter weight");
  });

  it("names the step in the user's unit when they aren't", () => {
    expect(loadStepLabel(1, false, "kg")).toBe("Plus 2 kg");
    expect(loadStepLabel(-1, false, "lb")).toBe("Minus 5 lb");
  });
});

describe("a Set draft", () => {
  it("starts from the previous Set's values", () => {
    expect(setDraft("external", { kind: "external", kg: 16.5, reps: 8 }, "kg")).toEqual({ load: "16.5", reps: "8" });
    expect(setDraft("timed", { kind: "timed", seconds: 45 }, "kg")).toEqual({ seconds: "45" });
  });

  // User story 19: 25 lb never shows as 24.9
  it("shows a previous load in the user's unit, as it was entered", () => {
    expect(setDraft("external", { kind: "external", kg: toKg(25, "lb"), reps: 8 }, "lb")).toEqual({
      load: "25",
      reps: "8",
    });
  });

  it("starts empty with no previous Set", () => {
    expect(setDraft("bodyweight", null, "lb")).toEqual({ reps: "" });
  });

  it("becomes the Set's values, reading a decimal comma", () => {
    expect(draftValues("external", { load: "16,5", reps: "10" }, "kg")).toEqual({
      values: { kind: "external", kg: 16.5, reps: 10 },
    });
    expect(draftValues("timed", { seconds: " 45 " }, "kg")).toEqual({ values: { kind: "timed", seconds: 45 } });
  });

  // User story 19: stored as its exact kg, never rounded
  it("stores a load entered in pounds as its exact kg", () => {
    expect(draftValues("external", { load: "25", reps: "10" }, "lb")).toEqual({
      values: { kind: "external", kg: toKg(25, "lb"), reps: 10 },
    });
  });

  it("asks for every field when one is empty or not a number, naming the user's unit", () => {
    expect(draftValues("external", { load: "", reps: "10" }, "lb")).toEqual({ error: "Enter lb and reps" });
    expect(draftValues("bodyweight", { reps: "ten" }, "lb")).toEqual({ error: "Enter reps" });
  });

  it("passes a typed load on as it is", () => {
    expect(draftValues("external", { load: "16.3", reps: "10" }, "kg")).toEqual({
      values: { kind: "external", kg: 16.3, reps: 10 },
    });
  });
});

describe("rpeMissing", () => {
  it("holds back a rated test Set until an RPE is picked", () => {
    expect(rpeMissing(true, undefined)).toBe(true);
    expect(rpeMissing(true, 9)).toBe(false);
  });

  it("never holds back a Set that isn't rated", () => {
    expect(rpeMissing(false, undefined)).toBe(false);
  });
});
