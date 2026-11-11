import { describe, expect, it } from "vitest";
import { exerciseBySlug } from "./data/exercises";
import { repRange } from "./working-levels";

// Story 28, ADR 0007: each kind of lift is trained in its own range, which progression (#132) climbs within
describe("repRange", () => {
  it.each([
    ["a dumbbell lift", "goblet-squat", "kg", { min: 8, max: 12 }],
    ["a cable lift", "lat-pulldown", "kg", { min: 8, max: 12 }],
    ["a barbell lift", "back-squat", "kg", { min: 6, max: 10 }],
    ["a landmine press, which needs a barbell too", "landmine-press", "kg", { min: 6, max: 10 }],
    ["a Ballistic Exercise, a fixed 8", "kettlebell-swing", "kg", { min: 8, max: 8 }],
    ["a band Exercise", "band-row", "band", { min: 10, max: 15 }],
    ["a weighted Exercise done with bands only", "dumbbell-lateral-raise", "band", { min: 10, max: 15 }],
  ] as const)("gives %s its range", (_, slug, unit, range) => {
    expect(repRange(exerciseBySlug(slug)!, unit)).toEqual(range);
  });

  it.each([
    ["a carry, whose reps mean nothing", "farmers-carry", "kg"],
    ["a bodyweight Exercise, which climbs its ladder to 15", "push-up", "reps"],
    ["a timed Exercise", "plank", "seconds"],
  ] as const)("gives %s no range", (_, slug, unit) => {
    expect(repRange(exerciseBySlug(slug)!, unit)).toBeNull();
  });
});
