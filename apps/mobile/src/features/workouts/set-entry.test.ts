import { describe, expect, it } from "vitest";
import { builtInEquipment, exerciseLoadsByEquipmentKg, type StepDirection } from "@fit/engines";
import { toKg } from "@fit/shared";
import {
  draftValues,
  fieldStepper,
  FIELD_STEPPERS,
  loadStep,
  loadStepLabel,
  loadStepper,
  rpeMissing,
  setDraft,
  stepValue,
} from "./set-entry";
import { setReading } from "./library";

describe("stepValue", () => {
  // Stands in for the next load: 10 a step, so it can't be mistaken for any other rule
  const byTen = loadStepper((load: number, direction: StepDirection) => load + 10 * direction, true, "kg");

  it("steps reps by 1 and seconds by 5", () => {
    expect(stepValue(FIELD_STEPPERS.reps, "8", 1)).toBe("9");
    expect(stepValue(FIELD_STEPPERS.seconds, "45", -1)).toBe("40");
  });

  it("steps a load to the next load it's given", () => {
    expect(stepValue(byTen, "16", 1)).toBe("26");
    expect(stepValue(byTen, "16", -1)).toBe("6");
  });

  it("steps an empty field up from nothing", () => {
    expect(stepValue(byTen, "", 1)).toBe("10");
    expect(stepValue(FIELD_STEPPERS.reps, " ", 1)).toBe("1");
  });

  it("never goes below zero", () => {
    expect(stepValue(byTen, "1", -1)).toBe("0");
    expect(stepValue(FIELD_STEPPERS.reps, "", -1)).toBe("0");
    expect(stepValue(FIELD_STEPPERS.seconds, "3", -1)).toBe("0");
  });

  it("keeps a typed half load, read with a decimal comma or point", () => {
    expect(stepValue(byTen, "16.5", 1)).toBe("26.5");
    expect(stepValue(byTen, "16,5", -1)).toBe("6.5");
  });

  // User story 19: display rounds to 0.5 of the user's unit
  it("rounds a typed load to the nearest 0.5 before stepping", () => {
    expect(stepValue(byTen, "16.2", 1)).toBe("26");
    expect(stepValue(byTen, "16.3", 1)).toBe("26.5");
  });

  it("rounds typed reps and seconds to whole numbers", () => {
    expect(stepValue(FIELD_STEPPERS.reps, "8.6", 1)).toBe("10");
    expect(stepValue(FIELD_STEPPERS.seconds, "44.2", 1)).toBe("49");
  });

  // #177: user story 13
  it("steps seconds by 5 at every length", () => {
    expect(["55", "60", "65", "70", "1200"].map((text) => stepValue(FIELD_STEPPERS.seconds, text, 1))).toEqual([
      "60",
      "65",
      "70",
      "75",
      "1205",
    ]);
    expect(["90", "65", "60"].map((text) => stepValue(FIELD_STEPPERS.seconds, text, -1))).toEqual(["85", "60", "55"]);
  });

  // #145: the walk steps by the minute, and by 5 s under one
  it("steps the walk of a minute or more to the next or previous whole minute", () => {
    expect(stepValue(FIELD_STEPPERS.minutes, "1200", 1)).toBe("1260");
    expect(stepValue(FIELD_STEPPERS.minutes, "1200", -1)).toBe("1140");
    expect(stepValue(FIELD_STEPPERS.minutes, "90", 1)).toBe("120");
    expect(stepValue(FIELD_STEPPERS.minutes, "90", -1)).toBe("60");
    expect(stepValue(FIELD_STEPPERS.minutes, "60", 1)).toBe("120");
  });

  it("steps the walk under a minute by 5 s, into and out of minutes", () => {
    expect(stepValue(FIELD_STEPPERS.minutes, "55", 1)).toBe("60");
    expect(stepValue(FIELD_STEPPERS.minutes, "60", -1)).toBe("55");
  });

  it("starts again from nothing when the field isn't a number", () => {
    expect(stepValue(byTen, "abc", 1)).toBe("10");
  });
});

// User story 18: the load stepper works in the user's unit
describe("loadStep", () => {
  it("steps to the next load the equipment has, as the user sees it", () => {
    const dumbbells = [toKg(20, "lb"), toKg(25, "lb"), toKg(30, "lb")];
    expect(loadStep([dumbbells], "lb")(25, 1)).toBe(30);
    expect(loadStep([dumbbells], "lb")(25, -1)).toBe(20);
    expect(loadStep([[10, 12.5, 15]], "kg")(12.5, 1)).toBe(15);
  });

  it("never sticks on a load whose kg is a hair off the one shown", () => {
    expect(loadStep([[12.5, 15]], "lb")(27.5, 1)).toBe(33);
  });

  it("stays put past the lightest or heaviest load", () => {
    expect(loadStep([[10, 12.5]], "kg")(12.5, 1)).toBe(12.5);
    expect(loadStep([[10, 12.5]], "kg")(10, -1)).toBe(10);
  });

  // #149: on a lb Full gym, an Exercise done with dumbbells or kettlebells
  describe("with dumbbells in pounds and kettlebells in kg", () => {
    const dumbbells = [20, 25, 30, 35].map((lb) => toKg(lb, "lb"));
    const kettlebells = [8, 12, 16];
    const step = loadStep([dumbbells, kettlebells], "lb");

    it("steps a dumbbell load through the dumbbells, never to a kettlebell between them", () => {
      expect(step(25, 1)).toBe(30);
      expect(step(30, -1)).toBe(25);
    });

    it("steps a kettlebell load through the kettlebells", () => {
      expect(step(26.5, 1)).toBe(35.5);
      expect(step(26.5, -1)).toBe(17.5);
    });

    it("steps a typed load on neither through the first kind of equipment", () => {
      expect(step(27, 1)).toBe(30);
    });
  });

  // #149: on a kg Full gym, 20 kg is both a kettlebell and a dumbbell
  describe("from a load on more than one kind of equipment, on a kg Full gym", () => {
    const fullGym = builtInEquipment("full_gym", "kg");
    const step = (slug: string) => loadStep(exerciseLoadsByEquipmentKg(slug, fullGym), "kg");

    it("steps a kettlebell Exercise through the kettlebells", () => {
      expect(step("kettlebell-swing")(20, 1)).toBe(24);
    });

    it("steps through the Exercise's first kind of equipment that has the load", () => {
      expect(step("renegade-row")(20, 1)).toBe(22.5);
    });
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

// #177: user stories 13 to 15
describe("a timed Set's stepper", () => {
  it("names a hold's step as 5 seconds at every length", () => {
    expect(FIELD_STEPPERS.seconds.stepLabel("45", 1)).toBe("Plus 5 seconds");
    expect(FIELD_STEPPERS.seconds.stepLabel("90", 1)).toBe("Plus 5 seconds");
    expect(FIELD_STEPPERS.seconds.stepLabel("90", -1)).toBe("Minus 5 seconds");
  });

  it("shows and names a hold in seconds at every length", () => {
    expect(FIELD_STEPPERS.seconds.shown("90")).toEqual({ value: "90", unit: "s", name: "seconds" });
  });

  it("names the walk's step as a minute, or 5 seconds under one, including down from a minute", () => {
    expect(FIELD_STEPPERS.minutes.stepLabel("1200", 1)).toBe("Plus 1 minute");
    expect(FIELD_STEPPERS.minutes.stepLabel("1200", -1)).toBe("Minus 1 minute");
    expect(FIELD_STEPPERS.minutes.stepLabel("45", 1)).toBe("Plus 5 seconds");
    expect(FIELD_STEPPERS.minutes.stepLabel("60", -1)).toBe("Minus 5 seconds");
    expect(FIELD_STEPPERS.minutes.stepLabel("", 1)).toBe("Plus 5 seconds");
  });

  it("shows the walk in minutes from a minute, and in seconds while it's typed", () => {
    expect(FIELD_STEPPERS.minutes.shown("1200", false)).toEqual({ value: "20", unit: "min", name: "minutes" });
    expect(FIELD_STEPPERS.minutes.shown("1200", true)).toEqual({ value: "1200", unit: "s", name: "seconds" });
    expect(FIELD_STEPPERS.minutes.shown("90", false)).toEqual({ value: "1 min 30", unit: "s", name: "seconds" });
    expect(FIELD_STEPPERS.minutes.shown("45", false)).toEqual({ value: "45", unit: "s", name: "seconds" });
  });

  it("leaves the walk's empty or half-typed field as it is", () => {
    expect(FIELD_STEPPERS.minutes.shown("", false).value).toBe("");
    expect(FIELD_STEPPERS.minutes.shown("12.", false).value).toBe("12.");
  });

  it("is the minutes one for the walk only", () => {
    expect(fieldStepper("seconds", setReading("walk"))).toBe(FIELD_STEPPERS.minutes);
    expect(fieldStepper("seconds", setReading("plank"))).toBe(FIELD_STEPPERS.seconds);
    expect(fieldStepper("reps", setReading("plank"))).toBe(FIELD_STEPPERS.reps);
  });
});

describe("what each field's stepper shows and says", () => {
  // #105: a Jump's dose is contacts
  it("says contacts for a Jump's reps, and reps otherwise", () => {
    expect(FIELD_STEPPERS.contacts.shown("6", false)).toEqual({ value: "6", unit: "contacts", name: "contacts" });
    expect(FIELD_STEPPERS.contacts.stepLabel("6", 1)).toBe("Plus 1 contact");
    expect(FIELD_STEPPERS.reps.stepLabel("8", -1)).toBe("Minus 1 rep");
  });

  it("names a load by the user's unit and types it with a decimal point", () => {
    const pounds = loadStepper(loadStep([], "lb"), false, "lb");
    expect(pounds.shown("25", false)).toEqual({ value: "25", unit: "lb", name: "lb" });
    expect(pounds.stepLabel("25", 1)).toBe("Plus 5 lb");
    expect(pounds.keyboardType).toBe("decimal-pad");
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
