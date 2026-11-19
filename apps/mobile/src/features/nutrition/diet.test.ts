import { dietOf } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { dietLabel } from "./diet";

describe("dietLabel", () => {
  // Spec #158 stories 6 and 7: the Diet and the foods avoided, as Profile and the Ideas half show them
  it.each([
    [{ kind: "any", avoid: [] }, "Any"],
    [{ kind: "pescatarian", avoid: [] }, "Pescatarian"],
    [{ kind: "vegan", avoid: ["nuts"] }, "Vegan, no nuts"],
    [{ kind: "vegetarian", avoid: ["dairy", "gluten"] }, "Vegetarian, no dairy or gluten"],
    [{ kind: "any", avoid: ["dairy", "gluten", "nuts", "pork"] }, "Any, no dairy, gluten, nuts or pork"],
  ] as const)("shows %j as %s", (diet, label) => {
    expect(dietLabel({ kind: diet.kind, avoid: [...diet.avoid] })).toBe(label);
  });

  it("is Any for a user who never chose a Diet", () => {
    expect(dietLabel(dietOf({}))).toBe("Any");
    expect(dietLabel(dietOf(undefined))).toBe("Any");
  });
});
