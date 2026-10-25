import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

describe("contrastRatio", () => {
  it("gives 21:1 for black on white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 2);
  });
  it("gives the same ratio whichever colour is in front", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 2);
  });
  it("gives 4.48:1 for #777777 on white, just under AA", () => {
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });
});
