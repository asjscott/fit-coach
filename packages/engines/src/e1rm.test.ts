import { describe, expect, it } from "vitest";
import { e1rm } from "./e1rm";

describe("e1rm", () => {
  it("estimates 100 kg x 5 as about 116.7 kg", () => {
    expect(e1rm(100, 5)).toBeCloseTo(116.67, 1);
  });
  it("rejects zero reps", () => {
    expect(() => e1rm(100, 0)).toThrow();
  });
});
