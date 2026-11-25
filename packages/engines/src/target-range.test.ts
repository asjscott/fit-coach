import type { SetTarget } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { exerciseBySlug } from "./data/exercises";
import { targetRange } from "./target-range";

const kg = (reps: number): SetTarget => ({ unit: "kg", kg: 20, reps });
const reps = (n: number): SetTarget => ({ unit: "reps", reps: n });
const seconds = (n: number): SetTarget => ({ unit: "seconds", seconds: n });
const band = (n: number): SetTarget => ({ unit: "band", level: "medium", reps: n });

// Stories 62–66 (#183)
describe("targetRange", () => {
  it.each([
    ["a weighted target", "goblet-squat", kg(9), { min: 8, max: 12 }],
    ["a weighted target at the top", "goblet-squat", kg(12), { min: 8, max: 12 }],
    ["a barbell target", "back-squat", kg(7), { min: 6, max: 10 }],
    ["a band target", "band-row", band(12), { min: 10, max: 15 }],
    ["a target climbing past the range", "goblet-squat", kg(14), { min: 8, max: 20 }],
    ["a band target climbing past the range", "band-row", band(16), { min: 10, max: 20 }],
    ["a target short of the range", "goblet-squat", kg(6), { min: 6, max: 12 }],
    ["a bodyweight target", "push-up", reps(10), { min: 10, max: 15 }],
    ["a bodyweight target at the top", "push-up", reps(15), { min: 15 }],
    ["a timed target", "plank", seconds(40), { min: 40, max: 60 }],
    ["a timed target at the top", "plank", seconds(60), { min: 60 }],
  ])("gives %s its range", (_, slug, target, range) => {
    expect(targetRange(exerciseBySlug(slug)!, target)).toEqual(range);
  });

  it.each([
    ["a Ballistic Exercise", "kettlebell-swing", kg(8)],
    ["a Ballistic Exercise short of its 8", "kettlebell-swing", kg(6)],
    ["a Jump", "box-jump", reps(5)],
    ["a carry", "farmers-carry", kg(8)],
    ["a Recovery Exercise", "cat-cow", seconds(45)],
    ["the walk", "walk", seconds(1200)],
  ])("gives %s none, as it's a fixed dose", (_, slug, target) => {
    expect(targetRange(exerciseBySlug(slug)!, target)).toBeNull();
  });
});
