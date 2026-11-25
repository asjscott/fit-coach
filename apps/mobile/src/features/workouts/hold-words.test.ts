import type { HoldState } from "@fit/engines";
import { describe, expect, it } from "vitest";
import { holdWords } from "./hold-words";

const state = (over: Partial<HoldState>): HoldState => ({
  phase: "hold",
  side: 1,
  secondsLeft: 0,
  secondsHeld: 0,
  atTop: false,
  ...over,
});
const range = { min: 30, max: 60 };

describe("holdWords", () => {
  it("counts down getting into position, then to the target", () => {
    expect(holdWords(state({ phase: "lead-in", secondsLeft: 5 }), range)).toEqual({
      phase: "Get into position",
      clock: "0:05",
      label: "Get into position, 0:05 left",
    });
    expect(holdWords(state({ secondsLeft: 30 }), range).label).toBe("Hold, 0:30 left");
  });

  it("counts up from the target, and says when it's at the top of the range", () => {
    expect(holdWords(state({ phase: "over", secondsHeld: 31 }), range)).toEqual({
      phase: "Target reached",
      clock: "0:31",
      label: "Target reached, 0:31 held",
    });
    expect(holdWords(state({ phase: "over", secondsHeld: 75, atTop: true }), range).label).toBe(
      "Top of the range, 1:15 held",
    );
  });

  it("only says to hold with no target", () => {
    expect(holdWords(state({ phase: "over", secondsHeld: 12 }), null).label).toBe("Hold, 0:12 held");
  });
});
