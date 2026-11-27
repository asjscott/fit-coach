import { describe, expect, it } from "vitest";
import { fixedRestChoice } from "./rest-choice";

// The slider for Rest between Sets, in the Workout's sheet, picks one length for every Exercise (#178, #206)
describe("fixedRestChoice", () => {
  it("is the length the slider stops at, in 15 s steps", () => {
    expect(fixedRestChoice(30)).toBe(30);
    expect(fixedRestChoice(75)).toBe(75);
    expect(fixedRestChoice(180)).toBe(180);
  });

  it("goes to the nearest 15 s step between them", () => {
    expect(fixedRestChoice(80)).toBe(75);
    expect(fixedRestChoice(83)).toBe(90);
  });

  it("stays between 30 s and 3 min", () => {
    expect(fixedRestChoice(0)).toBe(30);
    expect(fixedRestChoice(240)).toBe(180);
  });
});
