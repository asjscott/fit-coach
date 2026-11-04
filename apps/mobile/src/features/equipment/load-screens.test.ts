import { describe, expect, it } from "vitest";
import { loadScreens } from "./loads";

describe("loadScreens", () => {
  it("asks nothing when there are no weights to ask about", () => {
    expect(loadScreens(["pull_up_bar", "flat_bench"])).toEqual([]);
  });

  it("keeps what fits on one screen", () => {
    expect(loadScreens(["dumbbells", "kettlebells"])).toEqual([["dumbbells", "kettlebells"]]);
  });

  it("moves to another screen for the piece that won't fit, keeping plates with their barbell", () => {
    expect(loadScreens(["dumbbells", "kettlebells", "barbell", "plates", "loop_bands"])).toEqual([
      ["dumbbells", "kettlebells"],
      ["barbell", "plates", "loop_bands"],
    ]);
  });

  it("holds every piece of equipment across screens, in order", () => {
    const tags = ["tube_bands", "mini_bands", "loop_bands", "plates", "barbell", "kettlebells", "dumbbells"] as const;

    expect(loadScreens([...tags])).toEqual([
      ["dumbbells", "kettlebells"],
      ["barbell", "plates", "loop_bands"],
      ["mini_bands", "tube_bands"],
    ]);
  });
});
