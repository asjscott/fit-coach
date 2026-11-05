import { Exercise, Pattern, PRESETS } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { isAvailable } from "../equipment";
import { EXERCISES } from "./exercises";

// Checks the library data rather than the code that reads it

describe("exercise library", () => {
  const slugs = EXERCISES.map((e) => e.slug);

  it("has a unique slug for every exercise", () => {
    expect(slugs.filter((slug, i) => slugs.indexOf(slug) !== i)).toEqual([]);
  });

  it("points every regression and progression at a slug that exists", () => {
    const broken = EXERCISES.flatMap((e) =>
      [e.regression, e.progression]
        .filter((slug): slug is string => slug !== null && !slugs.includes(slug))
        .map((slug) => `${e.slug} -> ${slug}`),
    );
    expect(broken).toEqual([]);
  });

  it("marks only the two kettlebell swings as Ballistic Exercises", () => {
    expect(EXERCISES.filter((e) => e.ballistic).map((e) => e.slug)).toEqual([
      "kettlebell-swing",
      "single-arm-kettlebell-swing",
    ]);
  });

  it.each(EXERCISES.map((e) => [e.slug, e] as const))("%s passes Exercise.parse", (_slug, exercise) => {
    expect(() => Exercise.parse(exercise)).not.toThrow();
  });

  // Stops us shipping a library where, say, a bodyweight-only user has no way to train pull
  it.each(PRESETS)("gives the $name preset an exercise for every pattern except carry", (preset) => {
    const missing = Pattern.options
      .filter((pattern) => pattern !== "carry")
      .filter(
        (pattern) => !EXERCISES.some((e) => e.patterns.some((p) => p.pattern === pattern) && isAvailable(e, preset)),
      );
    expect(missing).toEqual([]);
  });
});
