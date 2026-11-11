import type { AssessmentPattern, EquipmentProfile, Set, WorkingLevel, Workout } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { assess } from "./assess";

const loggedAt = "2026-10-24T09:00:00.000Z";
const rated = (kg: number, rpe: number, reps = 5): Set => ({ kind: "external", kg, reps, rpe, loggedAt });
// A bodyweight or timed test is one Set to the most the user can do, unrated
const maxReps = (reps: number): Set => ({ kind: "bodyweight", reps, loggedAt });
const held = (seconds: number): Set => ({ kind: "timed", seconds, loggedAt });

const assessmentWorkout = (
  id: string,
  assessment: "A" | "B",
  startedAt: string,
  workoutExercises: { slug: string; sets: Set[] }[],
): Workout => ({
  id,
  assessment,
  startedAt,
  endedAt: new Date(Date.parse(startedAt) + 3_600_000).toISOString(),
  workoutExercises: workoutExercises.map((we) => ({ ...we, loadType: we.sets[0]?.kind ?? "external" })),
});

const A_ID = "11111111-1111-4111-8111-111111111111";
const B_ID = "22222222-2222-4222-8222-222222222222";

// A dumbbells-only user's pair: each test works up in Sets of 5 to RPE 9
const a = assessmentWorkout(A_ID, "A", "2026-10-20T09:00:00.000Z", [
  { slug: "goblet-squat", sets: [rated(10, 7), rated(12, 8), rated(14, 9), rated(16, 10)] },
  { slug: "dumbbell-romanian-deadlift", sets: [rated(14, 7), rated(16, 8), rated(20, 9)] },
  { slug: "plank", sets: [held(90)] },
]);
const b = assessmentWorkout(B_ID, "B", "2026-10-22T09:00:00.000Z", [
  { slug: "dumbbell-floor-press", sets: [rated(10, 8), rated(12, 10)] },
  { slug: "one-arm-dumbbell-row", sets: [rated(14, 8), rated(16, 9)] },
]);

const equipmentProfile = (
  id: string,
  tags: EquipmentProfile["tags"],
  loads: EquipmentProfile["loads"] = {},
): EquipmentProfile => ({ id, name: id, location: "home", isPrimary: id === "home", tags, loads });

const home = equipmentProfile("home", ["dumbbells"], {
  dumbbells: { kind: "fixed", weightsKg: [8, 10, 12, 14, 16, 20] },
});
const gym = equipmentProfile(
  "gym",
  ["barbell", "plates", "power_rack", "flat_bench", "cable_machine", "loop_bands", "tube_bands", "rings"],
  {
    barbell: { barKg: 20, platesKg: [1.25, 2.5, 5, 10, 20] },
    loop_bands: { levels: ["medium", "heavy"] },
    tube_bands: { levels: ["heavy", "extra_heavy"] },
  },
);
const profile = { weightKg: 80, gender: "male" } as const;

// A Pattern's result when it was tested, not estimated
const tested = (result: AssessmentPattern | undefined) => (result?.estimated === false ? result : undefined);

const levelOf = (workingLevels: WorkingLevel[], slug: string) => workingLevels.find((level) => level.slug === slug);

// A Working Level just set by this pair: B is the Workout that set it, with no Misses yet
const setByB = { movedBy: { workoutId: B_ID, startedAt: "2026-10-22T09:00:00.000Z" }, misses: 0, outgrown: false };

describe("assess", () => {
  it("records the pair, when its B started and the body weight used", () => {
    expect(assess(a, b, profile, [home]).assessment).toMatchObject({
      aWorkoutId: A_ID,
      bWorkoutId: B_ID,
      bStartedAt: "2026-10-22T09:00:00.000Z",
      bodyWeightKg: 80,
    });
  });

  it("takes the first Set at RPE 9 or higher as the top Set, and estimates the maximum from it", () => {
    const { squat } = assess(a, b, profile, [home]).assessment.patterns;

    expect(squat).toMatchObject({ slug: "goblet-squat", topSet: { kg: 14, reps: 5, rpe: 9 }, estimated: false });
    // 14 kg x 5 with 1 rep in reserve counts as 6 reps: 14 x (1 + 6/30)
    expect(tested(squat)?.maximum).toBeCloseTo(16.8, 5);
  });

  it("counts reps in reserve: RPE 9 estimates higher than RPE 10 at the same load", () => {
    const atRpe = (rpe: number) =>
      tested(
        assess(
          a,
          assessmentWorkout(B_ID, "B", "2026-10-22T09:00:00.000Z", [
            { slug: "dumbbell-floor-press", sets: [rated(12, rpe)] },
          ]),
          profile,
          [home],
        ).assessment.patterns.push,
      )?.maximum;

    // 12 x (1 + 5/30) at RPE 10, 12 x (1 + 6/30) at RPE 9
    expect(atRpe(10)).toBeCloseTo(14, 5);
    expect(atRpe(9)).toBeCloseTo(14.4, 5);
  });

  it("reads each Pattern's test from the Workout that tested it", () => {
    const { patterns } = assess(a, b, profile, [home]).assessment;

    expect(
      Object.fromEntries(Object.entries(patterns).map(([pattern, test]) => [pattern, tested(test)?.slug])),
    ).toEqual({
      squat: "goblet-squat",
      hinge: "dumbbell-romanian-deadlift",
      core: "plank",
      push: "dumbbell-floor-press",
      pull: "one-arm-dumbbell-row",
    });
  });

  describe("a test that didn't reach RPE 9", () => {
    const withSquat = (sets: Set[]) =>
      assessmentWorkout(A_ID, "A", "2026-10-20T09:00:00.000Z", [
        { slug: "goblet-squat", sets },
        { slug: "dumbbell-romanian-deadlift", sets: [rated(20, 9)] },
        { slug: "plank", sets: [held(90)] },
      ]);

    it("is load-limited when its last Set went past 12 reps: the maximum is a lower bound, Epley at 12 reps", () => {
      const { squat } = assess(withSquat([rated(16, 6), rated(20, 6), rated(20, 8, 15)]), b, profile, [home]).assessment
        .patterns;

      // 20 x (1 + 12/30) = 28, whatever the reps past 12 and the reps in reserve
      expect(squat).toMatchObject({
        slug: "goblet-squat",
        topSet: { kg: 20, reps: 15, rpe: 8 },
        loadLimited: true,
        estimated: false,
      });
      expect(tested(squat)?.maximum).toBeCloseTo(28, 5);
    });

    it("is untested when it stopped at 12 reps or fewer", () => {
      const { squat } = assess(withSquat([rated(10, 6), rated(14, 8, 12)]), b, profile, [home]).assessment.patterns;

      expect(squat).toEqual({ estimated: true, referenceStrength: expect.any(Number) });
    });
  });

  it("isn't load-limited when it reached RPE 9", () => {
    expect(assess(a, b, profile, [home]).assessment.patterns.squat).toMatchObject({ loadLimited: false });
  });

  describe("an untested Pattern", () => {
    // B with no push test, as when nothing on push's list was safe for the user's injuries
    const withoutPush = assessmentWorkout(B_ID, "B", "2026-10-22T09:00:00.000Z", [
      { slug: "one-arm-dumbbell-row", sets: [rated(14, 8), rated(16, 9)] },
    ]);

    it("is estimated from the others, scaled from how strong the user is for their weight", () => {
      const { push } = assess(a, withoutPush, profile, [home]).assessment.patterns;

      // For an 80 kg man the typical Reference Strengths are squat 80, hinge 100, push 60 and pull 80. He tested at
      // squat 42 (0.525 of typical), hinge 80 (0.8) and pull 19.2 / 0.3 = 64 (0.8): 0.7083 of typical on average.
      // Push is estimated at that share of 60, less a fifth since it wasn't measured: 60 x 0.7083 x 0.8 = 34
      expect(push).toEqual({ estimated: true, referenceStrength: expect.closeTo(34, 5) });
    });

    it("still gives its Exercises Working Levels", () => {
      const { workingLevels } = assess(a, withoutPush, profile, [home]);

      // A floor press is 0.37 of push's 34: 12.58, for 8 reps 12.58 / (1 + 10/30) = 9.435, so the 8 kg dumbbells
      expect(levelOf(workingLevels, "dumbbell-floor-press")).toEqual({
        slug: "dumbbell-floor-press",
        unit: "kg",
        kg: 8,
        reps: 8,
        ...setByB,
      });
      expect(levelOf(workingLevels, "push-up")?.unit).toBe("reps");
    });

    it("is estimated as typical for the user's weight and gender, less a fifth, when nothing was tested", () => {
      const nothing = (id: string, part: "A" | "B") => assessmentWorkout(id, part, "2026-10-22T09:00:00.000Z", []);
      const { patterns } = assess(nothing(A_ID, "A"), nothing(B_ID, "B"), { weightKg: 60, gender: "female" }, [
        home,
      ]).assessment;

      // A 60 kg woman's typical squat is 0.7 x 60 = 42, x 0.8 = 33.6. Core falls back to a 30 second plank
      expect(patterns.squat).toEqual({ estimated: true, referenceStrength: expect.closeTo(33.6, 5) });
      expect(patterns.core).toEqual({ estimated: true, referenceStrength: 30 });
    });

    it("counts a load-limited test as the floor it is", () => {
      const limitedSquat = assessmentWorkout(A_ID, "A", "2026-10-20T09:00:00.000Z", [
        { slug: "goblet-squat", sets: [rated(20, 8, 15)] },
        { slug: "dumbbell-romanian-deadlift", sets: [rated(20, 9)] },
      ]);
      const { push } = assess(limitedSquat, withoutPush, profile, [home]).assessment.patterns;

      // Squat at least 28 / 0.4 = 70 (0.875 of typical), hinge 0.8, pull 0.8: 60 x 0.825 x 0.8 = 39.6
      expect(push?.referenceStrength).toBeCloseTo(39.6, 5);
    });
  });

  it("keeps each tested Pattern's Reference Strength", () => {
    const { patterns } = assess(a, b, profile, [home]).assessment;

    // Goblet squat's maximum of 16.8 is 0.4 of a back squat's: 42 kg. The dumbbell Romanian deadlift's 24 is 0.3 of
    // a deadlift's: 80 kg
    expect(patterns.squat?.referenceStrength).toBeCloseTo(42, 5);
    expect(patterns.hinge?.referenceStrength).toBeCloseTo(80, 5);
  });

  // #131: a weighted Working Level is a load and a target reps at the bottom of its range, 8 for a dumbbell lift
  it("gives each tested Exercise the heaviest load the user has for 8 reps with 2 in reserve, for 8 reps", () => {
    const { workingLevels } = assess(a, b, profile, [home]);

    // The maximum / (1 + 10/30), then the heaviest dumbbell at or below it: squat 16.8 -> 12.6 -> 12,
    // hinge 20 x 1.2 = 24 -> 18 -> 16, push 12 x (1 + 5/30) = 14 -> 10.5 -> 10, pull 16 x 1.2 = 19.2 -> 14.4 -> 14
    const targetOf = (slug: string) => {
      const level = levelOf(workingLevels, slug);
      return level?.unit === "kg" ? [level.kg, level.reps] : undefined;
    };
    expect(targetOf("goblet-squat")).toEqual([12, 8]);
    expect(targetOf("dumbbell-romanian-deadlift")).toEqual([16, 8]);
    expect(targetOf("dumbbell-floor-press")).toEqual([10, 8]);
    expect(targetOf("one-arm-dumbbell-row")).toEqual([14, 8]);
  });

  it("gives every Exercise available in any of the Equipment Profiles a Working Level in its unit", () => {
    const { workingLevels } = assess(a, b, profile, [home, gym]);

    // Left out: what needs kettlebells, a mini band, a dip station, an ab wheel, a landmine, or dumbbells with a
    // bench or box, since neither profile has both
    const available = [
      ...["bodyweight-squat", "goblet-squat", "back-squat", "bulgarian-split-squat", "single-leg-glute-bridge"],
      ...["dumbbell-romanian-deadlift", "barbell-romanian-deadlift", "incline-push-up", "push-up"],
      ...["barbell-bench-press", "dumbbell-overhead-press", "inverted-row", "pull-up", "one-arm-dumbbell-row"],
      ...["band-pull-apart", "plank", "dead-bug", "farmers-carry"],
      ...["decline-push-up", "archer-push-up", "pike-push-up", "pull-up-negative", "chin-up", "glute-bridge"],
      ...["single-leg-romanian-deadlift", "split-squat", "reverse-lunge", "shrimp-squat", "pistol-squat", "step-up"],
      ...["ring-row", "ring-push-up", "ring-dip", "ring-fallout", "suspension-hamstring-curl"],
      ...["band-row", "band-lat-pulldown", "band-chest-press", "band-overhead-press", "band-good-morning"],
      ...["band-face-pull", "dumbbell-single-leg-romanian-deadlift", "dumbbell-bulgarian-split-squat"],
      ...["dumbbell-reverse-lunge", "cossack-squat", "dumbbell-floor-press", "single-arm-overhead-press"],
      ...["dumbbell-lateral-raise", "renegade-row", "side-plank", "hollow-hold", "bird-dog", "hanging-knee-raise"],
      ...["hanging-leg-raise", "pallof-press", "prone-ytw", "suitcase-carry", "front-rack-carry", "overhead-carry"],
      ...["lat-pulldown", "seated-cable-row", "deadlift", "barbell-overhead-press"],
    ];
    expect(workingLevels.map((level) => level.slug).sort()).toEqual(available.sort());
    expect(levelOf(workingLevels, "back-squat")?.unit).toBe("kg");
    expect(levelOf(workingLevels, "lat-pulldown")?.unit).toBe("kg");
    expect(levelOf(workingLevels, "push-up")?.unit).toBe("reps");
    expect(levelOf(workingLevels, "ring-row")?.unit).toBe("reps");
    expect(levelOf(workingLevels, "band-row")?.unit).toBe("band");
    expect(levelOf(workingLevels, "kettlebell-swing")).toBeUndefined();
  });

  it("scales the other Exercises of a Pattern from its Reference Strength", () => {
    const { workingLevels } = assess(a, b, profile, [home, gym]);

    // Squat's Reference Strength is 42 kg: a back squat's maximum. A barbell lift starts at 6 reps, the bottom of its
    // 6–10 range: 42 / (1 + 8/30) = 33.2, and the heaviest bar load at or below it is 32.5
    expect(levelOf(workingLevels, "back-squat")).toEqual({
      slug: "back-squat",
      unit: "kg",
      kg: 32.5,
      reps: 6,
      ...setByB,
    });
  });

  it("takes carry from hinge, for 8 reps as a carry has no range", () => {
    const { workingLevels } = assess(a, b, profile, [home]);

    // Hinge's Reference Strength is 80 kg; a farmer's carry is 0.4 of it per hand, 32 / (1 + 10/30) = 24, and the
    // heaviest dumbbell at or below it is 20
    expect(levelOf(workingLevels, "farmers-carry")).toEqual({
      slug: "farmers-carry",
      unit: "kg",
      kg: 20,
      reps: 8,
      ...setByB,
    });
  });

  it("gives a band Exercise the lightest band it can use, at the bottom of the 10–15 band range", () => {
    const { workingLevels } = assess(a, b, profile, [home, gym]);

    expect(levelOf(workingLevels, "band-row")).toEqual({
      slug: "band-row",
      unit: "band",
      level: "heavy",
      reps: 10,
      ...setByB,
    });
    expect(levelOf(workingLevels, "band-good-morning")).toMatchObject({ unit: "band", level: "medium", reps: 10 });
  });

  it("gives a core rep Exercise 10 reps", () => {
    const { workingLevels } = assess(a, b, profile, [home]);

    expect(levelOf(workingLevels, "dead-bug")).toEqual({ slug: "dead-bug", unit: "reps", reps: 10, ...setByB });
  });

  it("gives a bodyweight Exercise a rep target with 2 in reserve, from body weight x its share, at least 3, and at most 15", () => {
    const pushUpRepsAfter = (benchKg: number) => {
      const pushTest = assessmentWorkout(B_ID, "B", "2026-10-22T09:00:00.000Z", [
        { slug: "dumbbell-bench-press", sets: [rated(benchKg, 9)] },
      ]);
      return levelOf(assess(a, pushTest, profile, [home]).workingLevels, "push-up");
    };

    // 20 kg x 6 counts a maximum of 24, so a Reference Strength of 60 and a push-up maximum of 78 kg. The push-up
    // moves 80 x 0.64 = 51.2 kg: 30 x (78 / 51.2 - 1) = 15.7 reps to failure, 2 in reserve leaves 14
    expect(pushUpRepsAfter(20)).toEqual({ slug: "push-up", unit: "reps", reps: 14, ...setByB });
    expect(pushUpRepsAfter(8)).toEqual({ slug: "push-up", unit: "reps", reps: 3, ...setByB });
    // Above 15 it has outgrown the push-up, and the Coach starts on the harder variant (#131)
    expect(pushUpRepsAfter(40)).toEqual({ slug: "push-up", unit: "reps", reps: 15, ...setByB, outgrown: true });
  });

  it("takes plank seconds as core's Reference Strength, and seeds the timed Working Levels from it", () => {
    const { assessment, workingLevels } = assess(a, b, profile, [home]);

    expect(assessment.patterns.core).toMatchObject({ slug: "plank", topSet: { seconds: 90 }, maximum: 90 });
    expect(assessment.patterns.core?.referenceStrength).toBe(90);
    // A side plank and a hollow hold are each half a plank
    expect(levelOf(workingLevels, "plank")).toEqual({ slug: "plank", unit: "seconds", seconds: 90, ...setByB });
    expect(levelOf(workingLevels, "side-plank")).toEqual({
      slug: "side-plank",
      unit: "seconds",
      seconds: 45,
      ...setByB,
    });
    expect(levelOf(workingLevels, "hollow-hold")).toEqual({
      slug: "hollow-hold",
      unit: "seconds",
      seconds: 45,
      ...setByB,
    });
  });

  describe("with no equipment", () => {
    const bodyweightOnly = equipmentProfile("home", []);
    const pushUps = (reps: number) =>
      assessmentWorkout(B_ID, "B", "2026-10-22T09:00:00.000Z", [
        { slug: "push-up", sets: [maxReps(reps)] },
        { slug: "inverted-row", sets: [maxReps(12)] },
      ]);

    it("converts a push-up test to kg through body weight x its share, then Epley", () => {
      const { push } = assess(a, pushUps(10), profile, [bodyweightOnly]).assessment.patterns;

      // A push-up moves 80 x 0.64 = 51.2 kg. 10 reps to failure: 51.2 x (1 + 10/30) = 68.27 kg, and a push-up is 1.3
      // of a bench press, so push's Reference Strength is 52.51 kg
      expect(push).toMatchObject({ slug: "push-up", topSet: { reps: 10 }, estimated: false });
      expect(tested(push)?.maximum).toBeCloseTo(68.27, 2);
      expect(push?.referenceStrength).toBeCloseTo(52.51, 2);
    });

    it("gives the tested bodyweight Exercise back its reps to failure, less 2 in reserve", () => {
      // The round trip: test -> Reference Strength -> the same Exercise's maximum. 10 reps to failure, 2 in reserve,
      // leaves 8. Epley runs both ways past 12 reps too, so 15 leaves 13
      const pushUpLevel = (reps: number) =>
        levelOf(assess(a, pushUps(reps), profile, [bodyweightOnly]).workingLevels, "push-up");

      expect(pushUpLevel(10)).toEqual({ slug: "push-up", unit: "reps", reps: 8, ...setByB });
      expect(pushUpLevel(15)).toEqual({ slug: "push-up", unit: "reps", reps: 13, ...setByB });
    });

    it("tests every Pattern and gives every Exercise available without equipment a Working Level", () => {
      const bodyweightA = assessmentWorkout(A_ID, "A", "2026-10-20T09:00:00.000Z", [
        { slug: "bodyweight-squat", sets: [maxReps(25)] },
        { slug: "single-leg-glute-bridge", sets: [maxReps(15)] },
        { slug: "plank", sets: [held(60)] },
      ]);
      const { assessment, workingLevels } = assess(bodyweightA, pushUps(10), profile, [bodyweightOnly]);

      expect(Object.keys(assessment.patterns).sort()).toEqual(["core", "hinge", "pull", "push", "squat"]);
      const available = [
        ...["bodyweight-squat", "bulgarian-split-squat", "single-leg-glute-bridge", "incline-push-up", "push-up"],
        ...["plank", "dead-bug", "decline-push-up", "archer-push-up", "pike-push-up", "glute-bridge"],
        ...["single-leg-romanian-deadlift", "split-squat", "reverse-lunge", "shrimp-squat", "pistol-squat"],
        ...["cossack-squat", "side-plank", "hollow-hold", "bird-dog", "prone-ytw"],
      ];
      expect(workingLevels.map((level) => level.slug).sort()).toEqual(available.sort());
    });
  });
});
