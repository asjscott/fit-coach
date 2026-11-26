import { describe, expect, it } from "vitest";
import {
  finishedHoldSeconds,
  HOLD_LEAD_IN_SECONDS,
  holdCues,
  holdState,
  pauseHold,
  resumeHold,
  strengthHold,
  type Hold,
  type HoldRun,
} from "./hold-timer";

const START = Date.parse("2026-11-25T10:00:00Z");
// This many seconds after the start
const after = (seconds: number) => new Date(START + seconds * 1000);
const run: HoldRun = { startedAt: START, pauses: [] };

const plank: Hold = { leadInSeconds: 5, sides: 1, ends: "on-stop", target: { min: 30, max: 60 } };
const test: Hold = { ...plank, target: null };
const stretch: Hold = { leadInSeconds: 10, sides: 2, ends: "at-target", target: { min: 30 } };

const stateAt = (hold: Hold, seconds: number, of = run) => holdState(hold, of, after(seconds));

// The cues of a whole hold, each with the second it's due, looked at every 100 ms
function cuesOf(hold: Hold, seconds: number, of = run) {
  const cues: [number, string][] = [];
  for (let i = 1; i <= seconds * 10; i++)
    for (const { cue } of holdCues(hold, of, after((i - 1) / 10), after(i / 10))) cues.push([i / 10, cue]);
  return cues;
}

describe("a hold until Stop", () => {
  it("gives 5 s to get into position", () => {
    expect(stateAt(plank, 0)).toMatchObject({ phase: "lead-in", secondsLeft: 5, secondsHeld: 0 });
    expect(stateAt(plank, 4.2)).toMatchObject({ phase: "lead-in", secondsLeft: 1 });
  });

  it("counts down to the bottom of the range, then up", () => {
    expect(stateAt(plank, 5)).toMatchObject({ phase: "hold", secondsLeft: 30, secondsHeld: 0 });
    expect(stateAt(plank, 34.5)).toMatchObject({ phase: "hold", secondsLeft: 1, secondsHeld: 29 });
    expect(stateAt(plank, 35)).toMatchObject({ phase: "over", secondsHeld: 30, atTop: false });
    expect(stateAt(plank, 65)).toMatchObject({ phase: "over", secondsHeld: 60, atTop: true });
    expect(stateAt(plank, 305)).toMatchObject({ phase: "over", secondsHeld: 300 });
  });

  it("only counts up with no target", () => {
    expect(stateAt(test, 5)).toMatchObject({ phase: "over", secondsHeld: 0 });
    expect(stateAt(test, 17.9)).toMatchObject({ phase: "over", secondsHeld: 12, atTop: false });
  });

  it("cues the start and both ends of a range", () => {
    expect(cuesOf(plank, 90)).toEqual([
      [5, "start"],
      [35, "bottom"],
      [65, "top"],
    ]);
  });

  it("cues a single target once", () => {
    for (const target of [{ min: 30 }, { min: 30, max: 30 }])
      expect(cuesOf({ ...plank, target }, 90)).toEqual([
        [5, "start"],
        [35, "bottom"],
      ]);
  });

  it("cues only the start with no target", () => {
    expect(cuesOf(test, 90)).toEqual([[5, "start"]]);
  });

  it("leaves out cues long past, on return from the background", () => {
    expect(holdCues(plank, run, after(10), after(64))).toEqual([]);
    expect(holdCues(plank, run, after(10), after(66)).map(({ cue }) => cue)).toEqual(["top"]);
    expect(stateAt(plank, 66)).toMatchObject({ secondsHeld: 61 });
  });

  it("finishes with the whole seconds held, to the nearest, and none in the lead-in", () => {
    expect(finishedHoldSeconds(plank, run, after(47.4))).toBe(42);
    expect(finishedHoldSeconds(plank, run, after(47.6))).toBe(43);
    expect(finishedHoldSeconds(plank, run, after(3))).toBe(0);
  });
});

describe("a hold that ends at its target", () => {
  it("times each side, with the lead-in again between", () => {
    expect(stateAt(stretch, 9)).toMatchObject({ phase: "lead-in", side: 1, secondsLeft: 1 });
    expect(stateAt(stretch, 10)).toMatchObject({ phase: "hold", side: 1, secondsLeft: 30 });
    expect(stateAt(stretch, 40)).toMatchObject({ phase: "lead-in", side: 2, secondsLeft: 10, secondsHeld: 0 });
    expect(stateAt(stretch, 55)).toMatchObject({ phase: "hold", side: 2, secondsLeft: 25, secondsHeld: 5 });
    expect(stateAt(stretch, 80)).toMatchObject({ phase: "done", side: 2, secondsHeld: 30 });
    expect(stateAt(stretch, 500)).toMatchObject({ phase: "done", side: 2, secondsHeld: 30 });
  });

  it("is done after its only side", () => {
    expect(stateAt({ ...stretch, sides: 1 }, 40)).toMatchObject({ phase: "done", side: 1 });
  });

  it("cues each side's start, last 3 seconds and end", () => {
    expect(cuesOf(stretch, 100)).toEqual([
      [10, "start"],
      [37, "last-seconds"],
      [38, "last-seconds"],
      [39, "last-seconds"],
      [40, "end"],
      [50, "start"],
      [77, "last-seconds"],
      [78, "last-seconds"],
      [79, "last-seconds"],
      [80, "end"],
    ]);
  });

  it("says which side a cue is for", () => {
    expect(holdCues(stretch, run, after(49.9), after(50))).toEqual([{ cue: "start", side: 2 }]);
  });
});

describe("pausing", () => {
  const paused = pauseHold(run, after(20));
  const resumed = resumeHold(paused, after(120));

  it("stands still while paused, and goes on from there", () => {
    expect(stateAt(stretch, 110, paused)).toEqual(stateAt(stretch, 20));
    expect(holdCues(stretch, paused, after(20), after(110))).toEqual([]);
    expect(stateAt(stretch, 125, resumed)).toEqual(stateAt(stretch, 25));
    expect(cuesOf({ ...stretch, sides: 1 }, 150, resumed).at(-1)).toEqual([140, "end"]);
  });

  it("can pause more than once", () => {
    const again = resumeHold(pauseHold(resumed, after(125)), after(225));
    expect(stateAt(stretch, 230, again)).toEqual(stateAt(stretch, 30));
  });

  it("changes nothing to pause twice or resume a running one", () => {
    expect(pauseHold(paused, after(30))).toEqual(paused);
    expect(resumeHold(run, after(30))).toEqual(run);
  });
});

describe("strengthHold", () => {
  const logged = (slug: string, seconds?: number) => ({
    slug,
    loadType: "timed" as const,
    ...(seconds && { planned: { sets: 3, target: { unit: "seconds" as const, seconds } } }),
  });
  const training = { assessment: undefined, deloadWeek: undefined };

  it("times a plank to its target range after 5 s", () => {
    expect(HOLD_LEAD_IN_SECONDS).toBe(5);
    expect(strengthHold(logged("plank", 30), training)).toEqual(plank);
  });

  it("takes one number as both ends at the top of the ladder and in a deload week", () => {
    expect(strengthHold(logged("plank", 60), training)?.target).toEqual({ min: 60 });
    expect(strengthHold(logged("plank", 20), { ...training, deloadWeek: true })?.target).toEqual({ min: 20 });
  });

  it("has no target in an Assessment, nor with none planned", () => {
    expect(strengthHold(logged("plank", 30), { ...training, assessment: "single" })?.target).toBeNull();
    expect(strengthHold(logged("plank"), training)?.target).toBeNull();
  });

  it("times one hold for a one-sided Exercise", () => {
    expect(strengthHold(logged("side-plank", 30), training)?.sides).toBe(1);
  });

  it("isn't for the walk, other Recovery Exercises, loaded carries or reps", () => {
    for (const slug of ["walk", "worlds-greatest-stretch"]) expect(strengthHold(logged(slug, 45), training)).toBeNull();
    expect(strengthHold({ slug: "farmers-carry", loadType: "external" }, training)).toBeNull();
    expect(strengthHold({ slug: "push-up", loadType: "bodyweight" }, training)).toBeNull();
  });
});
