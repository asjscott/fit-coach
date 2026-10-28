import { describe, expect, it } from "vitest";
import { protocolNote } from "./protocol-note";

describe("protocolNote", () => {
  it("sends a done test on to the next test while one is left", () => {
    expect(protocolNote({ status: "done" }, 3, "external", { nextTest: true })).toEqual({
      text: "Done: that Set was your top Set. On to the next test.",
      finished: true,
    });
  });

  it("says a done test was the last one when every test is done", () => {
    expect(protocolNote({ status: "done" }, 3, "external", { nextTest: false })).toEqual({
      text: "Done: that Set was your top Set. That was the last test: finish the Workout when you're ready.",
      finished: true,
    });
  });

  it("ends a load-limited test the same way", () => {
    expect(protocolNote({ status: "load-limited" }, 4, "external", { nextTest: false })).toEqual({
      text: "Done: past 12 reps at your heaviest load. Your result is a lower bound, limited by your equipment. That was the last test: finish the Workout when you're ready.",
      finished: true,
    });
  });

  it("names the next load to try between Sets of a weighted test", () => {
    expect(protocolNote({ status: "working-up", suggestedKg: 14 }, 1, "external", { nextTest: true })).toEqual({
      text: "Next: 14 kg × 5, then rate it",
      finished: false,
    });
  });
});
