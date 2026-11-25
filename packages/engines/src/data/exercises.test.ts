import { Exercise, InjuryTag, Pattern, PRESETS, RecoveryArea, type Muscle } from "@fit/shared";
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

  // Stories 48-50 of #195 (#197)
  describe("Recovery Exercises", () => {
    const recovery = EXERCISES.filter((e) => e.recovery);
    const holds = recovery.filter((e) => e.slug !== "walk");
    const slugsIn = (area: string) => holds.filter((e) => e.area === area).map((e) => e.slug);

    it("are the walk, the first four holds and the spec's 27, each in its area", () => {
      expect(recovery.length).toBe(32);
      expect(slugsIn("hips_and_legs")).toEqual([
        "hip-flexor-stretch",
        "worlds-greatest-stretch",
        "pigeon",
        "figure-four",
        "90-90-switch",
        "couch-stretch",
        "frog-stretch",
        "butterfly",
        "deep-squat-hold",
        "seated-forward-fold",
        "lying-hamstring-stretch",
        "half-split",
        "standing-quad-stretch",
        "wall-calf-stretch",
        "bent-knee-calf-stretch",
        "ankle-rocks",
        "foam-roll-quads",
        "foam-roll-calves",
      ]);
      expect(slugsIn("back_and_spine")).toEqual([
        "open-book",
        "cat-cow",
        "childs-pose",
        "thread-the-needle",
        "cobra",
        "lying-spinal-twist",
        "knees-to-chest",
        "foam-roll-upper-back",
      ]);
      expect(slugsIn("chest_and_shoulders")).toEqual([
        "doorway-chest-stretch",
        "cross-body-shoulder-stretch",
        "overhead-triceps-stretch",
        "wall-slides",
        "neck-side-stretch",
      ]);
    });

    it("are timed, with no Pattern, and with one to three cues", () => {
      for (const e of recovery) {
        expect(e).toMatchObject({ loadType: "timed", patterns: [], oneSet: e.slug === "walk" });
        expect(e.cues.length).toBeGreaterThan(0);
      }
    });

    it("each have an area and a hold of 30 to 60 s, the first four 45 s, but for the walk", () => {
      for (const e of holds) {
        expect(e.area, e.slug).toBeDefined();
        expect(e.holdSeconds, e.slug).toBeGreaterThanOrEqual(30);
        expect(e.holdSeconds, e.slug).toBeLessThanOrEqual(60);
      }
      for (const e of holds.slice(0, 4)) expect(e.holdSeconds, e.slug).toBe(45);
    });

    it("are the only Exercises with an area or a hold, the walk having neither", () => {
      const others = EXERCISES.filter((e) => !holds.includes(e));
      expect(others.filter((e) => e.area !== undefined || e.holdSeconds !== undefined)).toEqual([]);
    });

    it("need no equipment, but for the three on a foam roller", () => {
      expect(
        holds.filter((e) => !isAvailable(e, builtInEquipment("bodyweight_only", "kg"))).map((e) => e.slug),
      ).toEqual(["foam-roll-upper-back", "foam-roll-quads", "foam-roll-calves"]);
      for (const e of holds.slice(-3)) expect(e.equipmentOptions).toEqual([["foam_roller"]]);
    });

    it("are avoided with the injuries they'd strain", () => {
      const avoided = Object.fromEntries(holds.map((e) => [e.slug, e.avoidWith]));
      expect(avoided).toMatchObject({
        "hip-flexor-stretch": ["hip", "knee"],
        "open-book": ["shoulder"],
        "cat-cow": ["wrist", "knee"],
        "worlds-greatest-stretch": ["wrist", "hip", "knee"],
      });
    });

    it("leave something to do for every area whatever one injury the user has", () => {
      const stranded = InjuryTag.options.flatMap((injury) =>
        RecoveryArea.options
          .filter((area) => !holds.some((e) => e.area === area && !e.avoidWith.includes(injury)))
          .map((area) => [injury, area]),
      );
      expect(stranded).toEqual([]);
    });

    it("parse from a collection seeded before areas and holds", () => {
      const before: Partial<Exercise> = { ...holds[0] };
      delete before.area;
      delete before.holdSeconds;
      expect(Exercise.parse(before)).toEqual(before);
    });
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
