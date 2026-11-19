import { describe, expect, it } from "vitest";
import { tapGlass, waterGlasses } from "./water-glasses";

describe("waterGlasses", () => {
  // Spec #158 story 46: a row of 250 ml glasses up to the water target
  it("shows a glass per 250 ml of the target, filled for each 250 ml drunk", () => {
    expect(waterGlasses(750, 2750)).toEqual({
      count: 11,
      filled: 3,
      caption: "Water · 0.75 of 2.75 L · tap a glass",
    });
  });

  it("rounds a target that isn't whole glasses up to the next glass", () => {
    expect(waterGlasses(0, 2600)).toMatchObject({ count: 11, filled: 0 });
  });

  // Logged before the target dropped (a lighter Weigh-in): every glass drunk still shows
  it("shows more glasses than the target when more was drunk", () => {
    expect(waterGlasses(3000, 2500)).toMatchObject({ count: 12, filled: 12 });
  });
});

describe("tapGlass", () => {
  // Spec #158 #166: an empty glass adds 250 ml and a filled one takes 250 ml off, whichever glass it is
  it("adds 250 ml for an empty glass and takes 250 ml off for a filled one", () => {
    expect(tapGlass(750, { filled: false })).toBe(1000);
    expect(tapGlass(750, { filled: true })).toBe(500);
  });

  it("never goes below none", () => {
    expect(tapGlass(0, { filled: true })).toBe(0);
  });
});
