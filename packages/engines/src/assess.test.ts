import type { EquipmentProfile, Set, WorkingLevel, Workout } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { assess } from "./assess";
import { EXERCISES } from "./data/exercises";
import { isAvailable } from "./equipment";

const loggedAt = "2026-10-24T09:00:00.000Z";
const rated = (kg: number, rpe: number, reps = 5): Set => ({ kind: "external", kg, reps, rpe, loggedAt });

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
  workoutExercises: workoutExercises.map((we) => ({ ...we, loadType: "external" })),
});

const A_ID = "11111111-1111-4111-8111-111111111111";
const B_ID = "22222222-2222-4222-8222-222222222222";

// A dumbbells-only user's pair: each test works up in Sets of 5 to RPE 9
const a = assessmentWorkout(A_ID, "A", "2026-10-20T09:00:00.000Z", [
  { slug: "goblet-squat", sets: [rated(10, 7), rated(12, 8), rated(14, 9), rated(16, 10)] },
  { slug: "dumbbell-romanian-deadlift", sets: [rated(14, 7), rated(16, 8), rated(20, 9)] },
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
const profile = { weightKg: 80 };

const levelOf = (workingLevels: WorkingLevel[], slug: string) => workingLevels.find((level) => level.slug === slug);

describe("assess", () => {
  it("records the pair and the body weight used", () => {
    expect(assess(a, b, profile, [home]).assessment).toMatchObject({
      aWorkoutId: A_ID,
      bWorkoutId: B_ID,
      bodyWeightKg: 80,
    });
  });

  it("takes the first Set at RPE 9 or higher as the top Set, and estimates the maximum from it", () => {
    const { squat } = assess(a, b, profile, [home]).assessment.patterns;

    expect(squat).toMatchObject({ slug: "goblet-squat", topSet: { kg: 14, reps: 5, rpe: 9 }, estimated: false });
    // 14 kg x 5 with 1 rep in reserve counts as 6 reps: 14 x (1 + 6/30)
    expect(squat?.maximumKg).toBeCloseTo(16.8, 5);
  });

  it("counts reps in reserve: RPE 9 estimates higher than RPE 10 at the same load", () => {
    const atRpe = (rpe: number) =>
      assess(
        a,
        assessmentWorkout(B_ID, "B", "2026-10-22T09:00:00.000Z", [
          { slug: "dumbbell-floor-press", sets: [rated(12, rpe)] },
        ]),
        profile,
        [home],
      ).assessment.patterns.push?.maximumKg;

    // 12 x (1 + 5/30) at RPE 10, 12 x (1 + 6/30) at RPE 9
    expect(atRpe(10)).toBeCloseTo(14, 5);
    expect(atRpe(9)).toBeCloseTo(14.4, 5);
  });

  it("reads each Pattern's test from the Workout that tested it", () => {
    const { patterns } = assess(a, b, profile, [home]).assessment;

    expect(Object.fromEntries(Object.entries(patterns).map(([pattern, test]) => [pattern, test?.slug]))).toEqual({
      squat: "goblet-squat",
      hinge: "dumbbell-romanian-deadlift",
      push: "dumbbell-floor-press",
      pull: "one-arm-dumbbell-row",
    });
  });

  it("keeps each tested Pattern's Reference Strength", () => {
    const { patterns } = assess(a, b, profile, [home]).assessment;

    // Goblet squat's maximum of 16.8 is 0.4 of a back squat's: 42 kg. The dumbbell Romanian deadlift's 24 is 0.3 of
    // a deadlift's: 80 kg
    expect(patterns.squat?.referenceStrength).toBeCloseTo(42, 5);
    expect(patterns.hinge?.referenceStrength).toBeCloseTo(80, 5);
  });

  it("gives each tested Exercise a Working Level in kg for 8 reps with 2 in reserve", () => {
    const { workingLevels } = assess(a, b, profile, [home]);

    // The maximum / (1 + 10/30): squat 16.8 -> 12.6, hinge 20 x 1.2 = 24 -> 18,
    // push 12 x (1 + 5/30) = 14 -> 10.5, pull 16 x 1.2 = 19.2 -> 14.4
    const kgOf = (slug: string) => {
      const level = levelOf(workingLevels, slug);
      return level?.unit === "kg" ? level.kg : undefined;
    };
    expect(kgOf("goblet-squat")).toBeCloseTo(12.6, 5);
    expect(kgOf("dumbbell-romanian-deadlift")).toBeCloseTo(18, 5);
    expect(kgOf("dumbbell-floor-press")).toBeCloseTo(10.5, 5);
    expect(kgOf("one-arm-dumbbell-row")).toBeCloseTo(14.4, 5);
  });

  it("gives every Exercise available in any of the Equipment Profiles a Working Level in its unit", () => {
    const { workingLevels } = assess(a, b, profile, [home, gym]);

    const available = EXERCISES.filter((e) => isAvailable(e, home) || isAvailable(e, gym)).map((e) => e.slug);
    // Timed Exercises scale from a plank test, which comes with bodyweight and timed tests (#37)
    const timed = EXERCISES.filter((e) => e.loadType === "timed").map((e) => e.slug);
    expect(workingLevels.map((level) => level.slug).sort()).toEqual(
      available.filter((slug) => !timed.includes(slug)).sort(),
    );
    expect(levelOf(workingLevels, "back-squat")?.unit).toBe("kg");
    expect(levelOf(workingLevels, "lat-pulldown")?.unit).toBe("kg");
    expect(levelOf(workingLevels, "push-up")?.unit).toBe("reps");
    expect(levelOf(workingLevels, "ring-row")?.unit).toBe("reps");
    expect(levelOf(workingLevels, "band-row")?.unit).toBe("band");
    expect(levelOf(workingLevels, "kettlebell-swing")).toBeUndefined();
  });

  it("scales the other Exercises of a Pattern from its Reference Strength", () => {
    const { workingLevels } = assess(a, b, profile, [home, gym]);

    // Squat's Reference Strength is 42 kg: a back squat's maximum, for 8 reps 42 / (1 + 10/30) = 31.5
    expect(levelOf(workingLevels, "back-squat")).toEqual({
      slug: "back-squat",
      unit: "kg",
      kg: expect.closeTo(31.5, 5),
    });
  });

  it("takes carry from hinge", () => {
    const { workingLevels } = assess(a, b, profile, [home]);

    // Hinge's Reference Strength is 80 kg; a farmer's carry is 0.4 of it per hand, 32 / (1 + 10/30) = 24
    expect(levelOf(workingLevels, "farmers-carry")).toEqual({
      slug: "farmers-carry",
      unit: "kg",
      kg: expect.closeTo(24, 5),
    });
  });

  it("gives a band Exercise the lightest band it can use, for 12 reps", () => {
    const { workingLevels } = assess(a, b, profile, [home, gym]);

    expect(levelOf(workingLevels, "band-row")).toEqual({ slug: "band-row", unit: "band", level: "heavy", reps: 12 });
    expect(levelOf(workingLevels, "band-good-morning")).toMatchObject({ unit: "band", level: "medium", reps: 12 });
  });

  it("gives a core rep Exercise 10 reps", () => {
    const { workingLevels } = assess(a, b, profile, [home]);

    expect(levelOf(workingLevels, "dead-bug")).toEqual({ slug: "dead-bug", unit: "reps", reps: 10 });
  });

  it("gives a bodyweight Exercise a rep target with 2 in reserve, from body weight x its share, capped to 3-20", () => {
    const pushUpRepsAfter = (benchKg: number) => {
      const pushTest = assessmentWorkout(B_ID, "B", "2026-10-22T09:00:00.000Z", [
        { slug: "dumbbell-bench-press", sets: [rated(benchKg, 9)] },
      ]);
      return levelOf(assess(a, pushTest, profile, [home]).workingLevels, "push-up");
    };

    // 20 kg x 6 counts a maximum of 24, so a Reference Strength of 60 and a push-up maximum of 78 kg. The push-up
    // moves 80 x 0.64 = 51.2 kg: 30 x (78 / 51.2 - 1) = 15.7 reps to failure, 2 in reserve leaves 14
    expect(pushUpRepsAfter(20)).toEqual({ slug: "push-up", unit: "reps", reps: 14 });
    expect(pushUpRepsAfter(8)).toEqual({ slug: "push-up", unit: "reps", reps: 3 });
    expect(pushUpRepsAfter(40)).toEqual({ slug: "push-up", unit: "reps", reps: 20 });
  });
});
