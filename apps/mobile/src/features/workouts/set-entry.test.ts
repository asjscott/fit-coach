import { describe, expect, it } from "vitest";
import { draftValues, setDraft, stepValue } from "./set-entry";

describe("stepValue", () => {
  // Stands in for the Logbook's next load: 10 kg a step, so it can't be mistaken for any other rule
  const byTen = (kg: number, direction: 1 | -1) => kg + 10 * direction;

  it("steps reps by 1 and seconds by 5", () => {
    expect(stepValue("reps", "8", 1, byTen)).toBe("9");
    expect(stepValue("seconds", "45", -1, byTen)).toBe("40");
  });

  it("steps kg to the load the Logbook gives", () => {
    expect(stepValue("kg", "16", 1, byTen)).toBe("26");
    expect(stepValue("kg", "16", -1, byTen)).toBe("6");
  });

  it("steps an empty field up from nothing", () => {
    expect(stepValue("kg", "", 1, byTen)).toBe("10");
    expect(stepValue("reps", " ", 1, byTen)).toBe("1");
  });

  it("never goes below zero", () => {
    expect(stepValue("kg", "1", -1, byTen)).toBe("0");
    expect(stepValue("reps", "", -1, byTen)).toBe("0");
    expect(stepValue("seconds", "3", -1, byTen)).toBe("0");
  });

  it("keeps a typed quarter-kilo weight, read with a decimal comma or point", () => {
    expect(stepValue("kg", "16.25", 1, byTen)).toBe("26.25");
    expect(stepValue("kg", "16,75", -1, byTen)).toBe("6.75");
  });

  it("rounds a weight that isn't a 0.25 kg step to the nearest one", () => {
    expect(stepValue("kg", "16.3", 1, byTen)).toBe("26.25");
    expect(stepValue("kg", "16.4", 1, byTen)).toBe("26.5");
  });

  it("rounds typed reps and seconds to whole numbers", () => {
    expect(stepValue("reps", "8.6", 1, byTen)).toBe("10");
    expect(stepValue("seconds", "44.2", 1, byTen)).toBe("49");
  });

  it("starts again from nothing when the field isn't a number", () => {
    expect(stepValue("kg", "abc", 1, byTen)).toBe("10");
  });
});

describe("a Set draft", () => {
  it("starts from the previous Set's values", () => {
    expect(setDraft("external", { kind: "external", kg: 16.25, reps: 8 })).toEqual({ kg: "16.25", reps: "8" });
    expect(setDraft("timed", { kind: "timed", seconds: 45 })).toEqual({ seconds: "45" });
  });

  it("starts empty with no previous Set", () => {
    expect(setDraft("bodyweight", null)).toEqual({ reps: "" });
  });

  it("becomes the Set's values, reading a decimal comma", () => {
    expect(draftValues("external", { kg: "16,5", reps: "10" })).toEqual({
      values: { kind: "external", kg: 16.5, reps: 10 },
    });
    expect(draftValues("timed", { seconds: " 45 " })).toEqual({ values: { kind: "timed", seconds: 45 } });
  });

  it("asks for every field when one is empty or not a number", () => {
    expect(draftValues("external", { kg: "", reps: "10" })).toEqual({ error: "Enter kg and reps" });
    expect(draftValues("bodyweight", { reps: "ten" })).toEqual({ error: "Enter reps" });
  });

  it("leaves the 0.25 kg rule to the Logbook, passing a typed weight on as it is", () => {
    expect(draftValues("external", { kg: "16.3", reps: "10" })).toEqual({
      values: { kind: "external", kg: 16.3, reps: 10 },
    });
  });
});
