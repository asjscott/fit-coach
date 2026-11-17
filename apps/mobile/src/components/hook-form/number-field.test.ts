import { bodyWeightAnswer, UserProfile } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { LoadsForm } from "../../features/equipment/loads";
import { numberFieldValue } from "./number-field";

const message = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

// #154: a number field's typed text becomes the form's value
describe("a number field's value", () => {
  it("stores a typed number as a number", () => {
    expect(numberFieldValue("180")).toBe(180);
    expect(numberFieldValue("176.4")).toBe(176.4);
  });

  it("keeps a number still being typed as text", () => {
    expect(numberFieldValue("176.")).toBe("176.");
    expect(numberFieldValue("-")).toBe("-");
  });

  it("keeps an emptied field empty rather than unset, so its default value doesn't come back", () => {
    // react-hook-form shows a field's default value again when the form's value is undefined: emptying a
    // body weight of 176.4 put 176.4 straight back
    expect(numberFieldValue("")).not.toBeUndefined();
    expect(numberFieldValue("")).toBeNull();
  });

  it("asks for a required body weight, height or birth year that was emptied", () => {
    expect(message(bodyWeightAnswer("lb").safeParse(numberFieldValue("")))).toBe("Enter your weight");
    expect(message(UserProfile.shape.heightCm.safeParse(numberFieldValue("")))).toBe("Enter your height");
    expect(message(UserProfile.shape.birthYear.safeParse(numberFieldValue("")))).toBe("Enter your birth year");
  });

  it("leaves an emptied optional load blank, so it isn't saved", () => {
    expect(LoadsForm.safeParse({ cable_machine: { step: numberFieldValue("") } }).success).toBe(true);
  });
});
