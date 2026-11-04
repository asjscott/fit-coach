import { describe, expect, it } from "vitest";
import { pullsSheet } from "./pulls-sheet";

describe("pullsSheet", () => {
  it("takes a downward drag when the list is at the top", () => {
    expect(pullsSheet({ dx: 0, dy: 20 }, 0)).toBe(true);
  });

  it("takes it past the top too, where iOS bounces", () => {
    expect(pullsSheet({ dx: 0, dy: 20 }, -12)).toBe(true);
  });

  it("leaves a downward drag to the list when it's scrolled down, so it scrolls back up", () => {
    expect(pullsSheet({ dx: 0, dy: 20 }, 1)).toBe(false);
    expect(pullsSheet({ dx: 0, dy: 300 }, 400)).toBe(false);
  });

  it("leaves taps, upward drags and sideways drags alone", () => {
    expect(pullsSheet({ dx: 0, dy: 6 }, 0)).toBe(false);
    expect(pullsSheet({ dx: 0, dy: -20 }, 0)).toBe(false);
    expect(pullsSheet({ dx: 30, dy: 20 }, 0)).toBe(false);
  });
});
