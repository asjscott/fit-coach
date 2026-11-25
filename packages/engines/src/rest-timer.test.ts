import type { Set } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { restSeconds } from "./rest-choice";
import { adjustRest, pairRestPlan, restAfterSet, restSecondsLeft, restStep, startRest, type Rest } from "./rest-timer";

const at = (iso: string) => new Date(iso);

describe("restSeconds", () => {
  it("rests 30 seconds less than a Set takes", () => {
    expect(restSeconds(180)).toBe(150);
  });

  it("never rests under 45 seconds", () => {
    expect(restSeconds(60)).toBe(45);
  });
});

describe("startRest", () => {
  it("gives a goblet squat 1:30 and a back squat 2:30", () => {
    expect(startRest("goblet-squat", at("2026-11-09T10:00:00Z")).endsAt).toBe(Date.parse("2026-11-09T10:01:30Z"));
    expect(startRest("back-squat", at("2026-11-09T10:00:00Z")).endsAt).toBe(Date.parse("2026-11-09T10:02:30Z"));
  });

  it("gives an Exercise this app version doesn't know the library's typical rest", () => {
    expect(startRest("not-in-the-library", at("2026-11-09T10:00:00Z")).endsAt).toBe(Date.parse("2026-11-09T10:01:15Z"));
  });
});

describe("restAfterSet", () => {
  const now = at("2026-11-09T10:00:00Z");
  const set: Set = { kind: "external", kg: 20, reps: 8, loggedAt: now.toISOString() };
  // A dumbbell bench press (120 s Sets, 90 s rest) paired with an inverted row (90 s Sets, 60 s rest), and a squat
  const workoutExercise = (id: string, slug: string, logged: number, planned: number, supersetWith?: string) => ({
    id,
    slug,
    loadType: "external" as const,
    sets: Array<Set>(logged).fill(set),
    planned: { sets: planned, target: { unit: "reps" as const, reps: 8 }, ...(supersetWith && { supersetWith }) },
  });
  const workout = (pressSets: number, rowSets: number, pressPlanned = 3) => ({
    workoutExercises: [
      workoutExercise("press", "dumbbell-bench-press", pressSets, pressPlanned, "row"),
      workoutExercise("row", "inverted-row", rowSets, 3, "press"),
      workoutExercise("squat", "goblet-squat", 1, 3),
    ],
  });
  const secondsOf = (rest: Rest | null) => rest && (rest.endsAt - now.getTime()) / 1000;

  it("rests as usual after a Set of an Exercise on its own", () => {
    expect(secondsOf(restAfterSet(workout(0, 0), "squat", now))).toBe(90);
  });

  // Seen in check W1: a Workout logged afterwards happened days ago, so a rest counting down now means nothing (#153)
  it("doesn't rest on a past Workout, while a live one rests as usual", () => {
    const past = { ...workout(0, 0), pastStart: "2026-11-06T09:00:00.000Z" };
    expect(restAfterSet(past, "squat", now)).toBeNull();
    // Nor after a pair's second Set
    expect(restAfterSet({ ...workout(1, 1), pastStart: past.pastStart }, "row", now)).toBeNull();
    expect(secondsOf(restAfterSet(workout(0, 0), "squat", now))).toBe(90);
  });

  it("doesn't rest between the two Exercises of a pair", () => {
    expect(restAfterSet(workout(1, 0), "press", now)).toBeNull();
  });

  it("rests the longer of the two rests after the pair's second Set", () => {
    // The row alone would rest 60 s
    expect(secondsOf(restAfterSet(workout(1, 1), "row", now))).toBe(90);
  });

  it("rests as usual once the other Exercise has no Sets left", () => {
    expect(secondsOf(restAfterSet(workout(4, 3, 4), "press", now))).toBe(90);
    expect(secondsOf(restAfterSet(workout(3, 4, 3), "row", now))).toBe(60);
  });

  // Seen in check S2: a 1-Set chin-up (120 s Sets, 90 s rest) paired with 3 Sets of lateral raise (60 s, 45 s rest)
  describe("once one Exercise of a pair has all its Sets", () => {
    const chinUpWithLateralRaise = (chinUpSets: number, lateralRaiseSets: number, chinUpFirst = true) => {
      const chinUp = workoutExercise("chin-up", "chin-up", chinUpSets, 1, "raise");
      const raise = workoutExercise("raise", "dumbbell-lateral-raise", lateralRaiseSets, 3, "chin-up");
      return { workoutExercises: chinUpFirst ? [chinUp, raise] : [raise, chinUp] };
    };

    it.each([true, false])("rests the pair's 90 s after round 1, then the lateral raise's own 45 s", (chinUpFirst) => {
      expect(restAfterSet(chinUpWithLateralRaise(1, 0, chinUpFirst), "chin-up", now)).toBeNull();
      expect(secondsOf(restAfterSet(chinUpWithLateralRaise(1, 1, chinUpFirst), "raise", now))).toBe(90);
      expect(secondsOf(restAfterSet(chinUpWithLateralRaise(1, 2, chinUpFirst), "raise", now))).toBe(45);
      expect(secondsOf(restAfterSet(chinUpWithLateralRaise(1, 3, chinUpFirst), "raise", now))).toBe(45);
    });

    it("rests the pair's 90 s when the lateral raise goes first in round 1", () => {
      expect(restAfterSet(chinUpWithLateralRaise(0, 1), "raise", now)).toBeNull();
      expect(secondsOf(restAfterSet(chinUpWithLateralRaise(1, 1), "chin-up", now))).toBe(90);
    });
  });

  describe("with a chosen rest", () => {
    it("rests the choice after a Set, whatever the Exercise", () => {
      expect(secondsOf(restAfterSet(workout(0, 0), "squat", now, 30))).toBe(30);
      expect(secondsOf(restAfterSet(workout(0, 0), "squat", now, 180))).toBe(180);
    });

    it("rests as usual on Auto", () => {
      expect(secondsOf(restAfterSet(workout(0, 0), "squat", now, "auto"))).toBe(90);
    });

    it("rests it after a superset's round, and never mid-round", () => {
      expect(restAfterSet(workout(1, 0), "press", now, 60)).toBeNull();
      expect(secondsOf(restAfterSet(workout(1, 1), "row", now, 60))).toBe(60);
    });

    it("rests it once the other Exercise of a pair has no Sets left", () => {
      expect(secondsOf(restAfterSet(workout(4, 3, 4), "press", now, 60))).toBe(60);
    });

    it("still doesn't rest on a past Workout", () => {
      expect(restAfterSet({ ...workout(0, 0), pastStart: "2026-11-06T09:00:00.000Z" }, "squat", now, 60)).toBeNull();
    });

    it("rests as on Auto in an Assessment", () => {
      expect(secondsOf(restAfterSet({ ...workout(0, 0), assessment: "A" }, "squat", now, 30))).toBe(90);
    });
  });

  describe("in the Recovery Workout", () => {
    const timed: Set = { kind: "timed", seconds: 45, loggedAt: now.toISOString() };
    const recovery = {
      workoutExercises: [
        { id: "walk", slug: "walk", loadType: "timed" as const, sets: [{ ...timed, seconds: 1200 }] },
        { id: "stretch", slug: "hip-flexor-stretch", loadType: "timed" as const, sets: [timed] },
      ],
    };

    it("doesn't rest after the walk, which goes straight on to the stretches", () => {
      expect(restAfterSet(recovery, "walk", now)).toBeNull();
      expect(restAfterSet(recovery, "walk", now, 60)).toBeNull();
    });

    it("rests as usual between a stretch's Sets", () => {
      expect(secondsOf(restAfterSet(recovery, "stretch", now))).toBe(70);
    });
  });
});

describe("pairRestPlan", () => {
  // A chin-up (120 s Sets, 90 s rest) with a lateral raise (60 s Sets, 45 s rest)
  const member = (slug: string, logged: number, planned: number) => ({
    slug,
    sets: Array<Set>(logged).fill({ kind: "bodyweight", reps: 8, loggedAt: "2026-11-09T10:00:00Z" }),
    planned: { sets: planned, target: { unit: "reps" as const, reps: 8 } },
  });
  const plan = (chinUp: [number, number], raise: [number, number]) =>
    pairRestPlan([member("chin-up", ...chinUp), member("dumbbell-lateral-raise", ...raise)]);

  it("rests the longer of the two after each round, with nothing more when both have as many Sets", () => {
    expect(plan([0, 3], [0, 3])).toEqual({ pairSeconds: 90 });
  });

  it("says which has fewer Sets, and the other's own rest for once it's done", () => {
    expect(plan([0, 1], [0, 3])).toEqual({ pairSeconds: 90, fewer: { slug: "chin-up", otherSeconds: 45 } });
  });

  it("rests the chosen rest after each round and once the other is done", () => {
    const pair = [member("chin-up", 1, 1), member("dumbbell-lateral-raise", 1, 3)] as const;
    expect(pairRestPlan(pair, 60)).toEqual({
      pairSeconds: 60,
      fewer: { slug: "chin-up", otherSeconds: 60 },
      done: "chin-up",
    });
  });

  it("isn't done with the one with fewer Sets until the round it's in is over", () => {
    expect(plan([1, 1], [0, 3]).done).toBeUndefined();
    expect(plan([1, 1], [1, 3]).done).toBe("chin-up");
    expect(plan([1, 1], [3, 3]).done).toBe("chin-up");
  });
});

describe("restSecondsLeft", () => {
  const rest = startRest("back-squat", at("2026-11-09T10:00:00Z"));

  it("counts down to the end time, however long the app was in the background", () => {
    // Backgrounded at 10:00:10 and back at 10:02:00, with no ticks in between
    expect(restSecondsLeft(rest, at("2026-11-09T10:02:00Z"))).toBe(30);
  });

  it("rounds a part second up, so it shows 0 only at the end", () => {
    expect(restSecondsLeft(rest, at("2026-11-09T10:02:29.200Z"))).toBe(1);
  });

  it("stops at 0 once the rest is over", () => {
    expect(restSecondsLeft(rest, at("2026-11-09T10:05:00Z"))).toBe(0);
  });
});

describe("adjustRest", () => {
  const rest = startRest("back-squat", at("2026-11-09T10:00:00Z"));
  const atTwoMinutes = at("2026-11-09T10:02:00Z");

  it("adds 15 seconds to the current rest", () => {
    expect(adjustRest(rest, 15, atTwoMinutes)).toEqual({ endsAt: Date.parse("2026-11-09T10:02:45Z") });
  });

  it("takes 15 seconds off the current rest", () => {
    expect(adjustRest(rest, -15, atTwoMinutes)).toEqual({ endsAt: Date.parse("2026-11-09T10:02:15Z") });
  });

  it("ends the rest when there's less than that left", () => {
    expect(adjustRest(rest, -15, at("2026-11-09T10:02:16Z"))).toBeNull();
  });

  it("keeps what else the rest holds", () => {
    expect(adjustRest({ ...rest, expanded: true }, 15, atTwoMinutes)).toEqual({
      endsAt: Date.parse("2026-11-09T10:02:45Z"),
      expanded: true,
    });
  });

  it("leaves the next rest its usual length", () => {
    adjustRest(rest, 15, atTwoMinutes);
    expect(startRest("back-squat", at("2026-11-09T10:03:00Z")).endsAt).toBe(Date.parse("2026-11-09T10:05:30Z"));
  });
});

describe("restStep", () => {
  const rest: Rest = { endsAt: Date.parse("2026-11-09T10:01:30Z") };
  const step = (before: string, now: string) =>
    restStep(rest, at(`2026-11-09T10:${before}Z`), at(`2026-11-09T10:${now}Z`));

  it("is quiet until the last 3 seconds", () => {
    expect(step("01:25.900", "01:26.100")).toEqual({ ended: false, alerts: false });
  });

  it.each([
    ["3", "01:26.950", "01:27.050"],
    ["2", "01:27.950", "01:28.050"],
    ["1", "01:28.950", "01:29.050"],
  ])("alerts as the countdown turns to %s", (_, before, now) => {
    expect(step(before, now)).toEqual({ ended: false, alerts: true });
  });

  it("alerts once for each of the last seconds", () => {
    expect(step("01:27.050", "01:27.150")).toEqual({ ended: false, alerts: false });
  });

  it("alerts as it ends", () => {
    expect(step("01:29.950", "01:30.050")).toEqual({ ended: true, alerts: true });
  });

  it("ends quietly when it ended a while ago, with the app in the background", () => {
    expect(step("00:20.000", "03:00.000")).toEqual({ ended: true, alerts: false });
  });

  it("goes on quietly after the app was in the background for part of it", () => {
    expect(step("00:20.000", "01:10.000")).toEqual({ ended: false, alerts: false });
  });
});
