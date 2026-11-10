import { describe, expect, it } from "vitest";
import { takesAnotherSet } from "./recovery-workout";

describe("takesAnotherSet", () => {
  const sets = (count: number) => Array.from({ length: count }, () => ({}));

  it("takes the walk's one Set and no Set 2", () => {
    expect(takesAnotherSet({ slug: "walk", sets: sets(0) })).toBe(true);
    expect(takesAnotherSet({ slug: "walk", sets: sets(1) })).toBe(false);
  });

  it("lets the stretches and every other Exercise go past their target", () => {
    expect(takesAnotherSet({ slug: "cat-cow", sets: sets(2) })).toBe(true);
    expect(takesAnotherSet({ slug: "goblet-squat", sets: sets(5) })).toBe(true);
  });
});
