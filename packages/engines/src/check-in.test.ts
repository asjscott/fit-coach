import { describe, expect, it } from "vitest";
import { readiness, readinessShare } from "./check-in";

describe("readiness", () => {
  it("adds sleep, energy and how little soreness, from 3 to 15", () => {
    expect(readiness({ sleep: 1, energy: 1, soreness: 5 })).toBe(3);
    expect(readiness({ sleep: 1, energy: 2, soreness: 5 })).toBe(4);
    expect(readiness({ sleep: 4, energy: 4, soreness: 4 })).toBe(10);
    expect(readiness({ sleep: 5, energy: 5, soreness: 1 })).toBe(15);
  });
});

describe("the share of Sets a check-in keeps", () => {
  it("keeps everything with no check-in", () => {
    expect(readinessShare(null)).toBe(1);
  });

  it("keeps 0.7 after a bad night: sleep 1, energy 2, soreness 5", () => {
    expect(readinessShare({ sleep: 1, energy: 2, soreness: 5 })).toBe(0.7);
  });

  it("keeps everything with all 4s", () => {
    expect(readinessShare({ sleep: 4, energy: 4, soreness: 4 })).toBe(1);
  });

  it("keeps 0.7 up to 6, 0.85 up to 9, and everything above", () => {
    expect(readinessShare({ sleep: 2, energy: 2, soreness: 4 })).toBe(0.7); // 6
    expect(readinessShare({ sleep: 2, energy: 2, soreness: 3 })).toBe(0.85); // 7
    expect(readinessShare({ sleep: 3, energy: 3, soreness: 3 })).toBe(0.85); // 9
    expect(readinessShare({ sleep: 3, energy: 4, soreness: 3 })).toBe(1); // 10
  });
});
