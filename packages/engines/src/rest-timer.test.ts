import type { Set } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { extendRest, restAfterSet, restSeconds, restSecondsLeft, startRest, type Rest } from "./rest-timer";

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

describe("extendRest", () => {
  it("adds 15 seconds to the current rest", () => {
    const rest = startRest("back-squat", at("2026-11-09T10:00:00Z"));
    expect(restSecondsLeft(extendRest(rest), at("2026-11-09T10:02:00Z"))).toBe(45);
  });

  it("leaves the next rest its usual length", () => {
    extendRest(startRest("back-squat", at("2026-11-09T10:00:00Z")));
    expect(startRest("back-squat", at("2026-11-09T10:03:00Z")).endsAt).toBe(Date.parse("2026-11-09T10:05:30Z"));
  });
});
