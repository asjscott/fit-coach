import { describe, expect, it } from "vitest";
import { e1rm, epley, epleyLoadKg, epleyReps } from "./e1rm";

describe("e1rm", () => {
  it("estimates 100 kg x 5 as about 116.7 kg", () => {
    expect(e1rm(100, 5)).toBeCloseTo(116.67, 1);
  });

  it("returns the load itself for 1 rep", () => {
    expect(e1rm(100, 1)).toBe(100);
  });

  it("estimates 12 reps, the most it trusts", () => {
    expect(e1rm(100, 12)).toBeCloseTo(140, 5);
  });

  it("refuses more than 12 reps", () => {
    expect(() => e1rm(100, 13)).toThrow();
  });

  it("rejects zero reps", () => {
    expect(() => e1rm(100, 0)).toThrow();
  });

  // A Set of 5 at RPE 9 had 1 rep in reserve, so it counts as 6 reps: 100 x (1 + 6/30)
  it("counts reps in reserve when given reps plus 10 minus the RPE", () => {
    const rpe = 9;
    expect(e1rm(100, 5 + (10 - rpe))).toBeCloseTo(120, 5);
  });
});

describe("Epley both ways", () => {
  // 100 kg x 15 to failure: 100 x (1 + 15/30) = 150 kg
  it("estimates past 12 reps, and inverts back to the load and to the reps", () => {
    expect(epley(100, 15)).toBeCloseTo(150, 5);
    expect(epleyLoadKg(150, 15)).toBeCloseTo(100, 5);
    expect(epleyReps(150, 100)).toBeCloseTo(15, 5);
  });
});
