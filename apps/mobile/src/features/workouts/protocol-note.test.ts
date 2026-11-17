import { describe, expect, it } from "vitest";
import { protocolNote } from "./protocol-note";

describe("protocolNote", () => {
  it("sends a done test on to the next test while one is left", () => {
    expect(protocolNote({ status: "done" }, 3, "external", { nextTest: true, unit: "kg" })).toEqual({
      text: "Done: that Set was your top Set. On to the next test.",
      finished: true,
    });
  });

  it("says a done test was the last one when every test is done", () => {
    expect(protocolNote({ status: "done" }, 3, "external", { nextTest: false, unit: "kg" })).toEqual({
      text: "Done: that Set was your top Set. That was the last test: finish the Workout when you're ready.",
      finished: true,
    });
  });

  it("ends a load-limited test the same way", () => {
    expect(protocolNote({ status: "load-limited" }, 4, "external", { nextTest: false, unit: "kg" })).toEqual({
      text: "Done: past 12 reps at your heaviest load. Your result is a lower bound, limited by your equipment. That was the last test: finish the Workout when you're ready.",
      finished: true,
    });
  });

  it("names the next load to try between Sets of a weighted test", () => {
    expect(
      protocolNote({ status: "working-up", suggestedKg: 14 }, 1, "external", { nextTest: true, unit: "kg" }),
    ).toEqual({
      text: "Next: 14 kg × 5, then rate it",
      finished: false,
    });
  });

  // User story 18: the Assessment's suggested loads show in the user's unit
  it("names the suggested load in the user's unit, to 0.5 of it", () => {
    const options = { nextTest: true, unit: "lb" } as const;
    expect(protocolNote({ status: "working-up", suggestedKg: 14 }, 1, "external", options).text).toBe(
      "Next: 31 lb × 5, then rate it",
    );
    expect(protocolNote({ status: "working-up", suggestedKg: 14 }, 0, "external", options).text).toBe(
      "Sets of 5, adding weight each Set until one is RPE 9. Start at 31 lb.",
    );
    expect(protocolNote({ status: "at-heaviest", suggestedKg: 20 }, 2, "external", options).text).toBe(
      "44 lb is your heaviest: as many reps as you can to RPE 9. Past 12 reps ends the test.",
    );
  });
});
