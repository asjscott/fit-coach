import { Exercise, Pattern, PRESETS, type Muscle } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { builtInEquipment, isAvailable, type ProfileWithLoads } from "../equipment";
import { EXERCISES } from "./exercises";

// The jump ladder, easiest first
const JUMPS = ["pogo-hop", "squat-jump", "countermovement-jump", "box-jump", "broad-jump", "lateral-bound"];

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

  it("marks only the two kettlebell swings and the six jumps as Ballistic Exercises", () => {
    expect(EXERCISES.filter((e) => e.ballistic).map((e) => e.slug)).toEqual([
      "kettlebell-swing",
      "single-arm-kettlebell-swing",
      ...JUMPS,
    ]);
  });

  // Story 13: jumps for the athletic Goal (#105)
  describe("jumps", () => {
    const jumps = JUMPS.map((slug) => EXERCISES.find((e) => e.slug === slug));

    it("are bodyweight Ballistic Exercises, avoided with a knee or ankle injury", () => {
      for (const jump of jumps) {
        expect(jump).toMatchObject({ loadType: "bodyweight", ballistic: true });
        expect(jump?.avoidWith).toEqual(expect.arrayContaining(["knee", "ankle"]));
      }
    });

    it("form a ladder from the bodyweight squat, easiest first", () => {
      expect(jumps.map((jump) => jump?.regression)).toEqual(["bodyweight-squat", ...JUMPS.slice(0, -1)]);
      expect(jumps.map((jump) => jump?.progression)).toEqual([...JUMPS.slice(1), null]);
    });

    it("each have cues", () => {
      for (const jump of jumps) expect(jump?.cues.length).toBeGreaterThan(0);
    });
  });

  it("marks only the five timed recovery Exercises as Recovery Exercises", () => {
    const recovery = EXERCISES.filter((e) => e.recovery);
    expect(recovery.map((e) => e.slug)).toEqual([
      "walk",
      "hip-flexor-stretch",
      "open-book",
      "cat-cow",
      "worlds-greatest-stretch",
    ]);
    expect(recovery.every((e) => e.loadType === "timed")).toBe(true);
  });

  it("marks only the walk as one Set (#109)", () => {
    expect(EXERCISES.filter((e) => e.oneSet).map((e) => e.slug)).toEqual(["walk"]);
  });

  it.each(EXERCISES.map((e) => [e.slug, e] as const))("%s passes Exercise.parse", (_slug, exercise) => {
    expect(() => Exercise.parse(exercise)).not.toThrow();
  });

  // Story 49 of #176: how many dumbbells, so the loads and what one bar can do are known (#181)
  it("says one or two for every Exercise that can be done with dumbbells, and for no other", () => {
    const canUseDumbbells = (e: Exercise) => e.equipmentOptions.some((option) => option.includes("dumbbells"));
    expect(EXERCISES.filter((e) => canUseDumbbells(e) !== (e.dumbbells !== undefined)).map((e) => e.slug)).toEqual([]);
  });

  // The spec's lists (#176); a dumbbell Exercise on neither is decided by its movement
  it.each([
    [
      1,
      [
        "goblet-squat",
        "one-arm-dumbbell-row",
        "single-arm-dumbbell-bench-press",
        "single-arm-overhead-press",
        "suitcase-carry",
        "dumbbell-overhead-triceps-extension",
        "dumbbell-single-leg-romanian-deadlift",
        "calf-raise",
        "overhead-carry",
        "dumbbell-hip-thrust",
      ],
    ],
    [
      2,
      [
        "dumbbell-floor-press",
        "dumbbell-bench-press",
        "dumbbell-overhead-press",
        "dumbbell-lateral-raise",
        "chest-supported-dumbbell-row",
        "dumbbell-curl",
        "dumbbell-romanian-deadlift",
        "dumbbell-reverse-lunge",
        "dumbbell-bulgarian-split-squat",
        "renegade-row",
        "farmers-carry",
        "front-rack-carry",
        "dumbbell-step-up",
      ],
    ],
  ])("takes %i dumbbells for the spec's Exercises", (count, expected) => {
    expect(EXERCISES.flatMap((e) => (e.dumbbells === count ? [e.slug] : [])).sort()).toEqual([...expected].sort());
  });

  // Story 12: budgets the library couldn't reach before (#101)
  const primaryOn = (muscle: Muscle, profile: ProfileWithLoads) =>
    EXERCISES.filter((e) => !e.recovery && e.muscles.primary.includes(muscle) && isAvailable(e, profile)).map(
      (e) => e.slug,
    );

  it("has a calf raise, the only Exercise with calves as a primary Muscle", () => {
    expect(primaryOn("calves", builtInEquipment("full_gym", "kg"))).toEqual(["calf-raise"]);
  });

  it("has a curl as well as the chin-up for biceps", () => {
    expect(primaryOn("biceps", builtInEquipment("full_gym", "kg"))).toEqual(["chin-up", "dumbbell-curl"]);
  });

  it("gives Bodyweight only a table row for lats", () => {
    expect(primaryOn("lats", builtInEquipment("bodyweight_only", "kg"))).toEqual(["table-row"]);
  });

  // Stops us shipping a library where, say, a bodyweight-only user has no way to train pull
  it.each(PRESETS)("gives the $name preset an exercise for every pattern except carry", (preset) => {
    const missing = Pattern.options
      .filter((pattern) => pattern !== "carry")
      .filter(
        (pattern) =>
          !EXERCISES.some(
            (e) => e.patterns.some((p) => p.pattern === pattern) && isAvailable(e, { ...preset, loads: {} }),
          ),
      );
    expect(missing).toEqual([]);
  });
});
