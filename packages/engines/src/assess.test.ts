import type { Set, Workout } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { assess } from "./assess";

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

describe("assess", () => {
  it("records the pair and the body weight used", () => {
    expect(assess(a, b, { weightKg: 80 }).assessment).toMatchObject({
      aWorkoutId: A_ID,
      bWorkoutId: B_ID,
      bodyWeightKg: 80,
    });
  });

  it("takes the first Set at RPE 9 or higher as the top Set, and estimates the maximum from it", () => {
    const { squat } = assess(a, b, { weightKg: 80 }).assessment.patterns;

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
        {
          weightKg: 80,
        },
      ).assessment.patterns.push?.maximumKg;

    // 12 x (1 + 5/30) at RPE 10, 12 x (1 + 6/30) at RPE 9
    expect(atRpe(10)).toBeCloseTo(14, 5);
    expect(atRpe(9)).toBeCloseTo(14.4, 5);
  });

  it("reads each Pattern's test from the Workout that tested it", () => {
    const { patterns } = assess(a, b, { weightKg: 80 }).assessment;

    expect(Object.fromEntries(Object.entries(patterns).map(([pattern, test]) => [pattern, test?.slug]))).toEqual({
      squat: "goblet-squat",
      hinge: "dumbbell-romanian-deadlift",
      push: "dumbbell-floor-press",
      pull: "one-arm-dumbbell-row",
    });
  });

  it("gives each tested Exercise a Working Level in kg for 8 reps with 2 in reserve", () => {
    const { workingLevels } = assess(a, b, { weightKg: 80 });

    // The maximum / (1 + 10/30): squat 16.8 -> 12.6, hinge 20 x 1.2 = 24 -> 18,
    // push 12 x (1 + 5/30) = 14 -> 10.5, pull 16 x 1.2 = 19.2 -> 14.4
    expect(workingLevels).toHaveLength(4);
    const kgBySlug = Object.fromEntries(workingLevels.map((level) => [level.slug, level.unit === "kg" && level.kg]));
    expect(kgBySlug["goblet-squat"]).toBeCloseTo(12.6, 5);
    expect(kgBySlug["dumbbell-romanian-deadlift"]).toBeCloseTo(18, 5);
    expect(kgBySlug["dumbbell-floor-press"]).toBeCloseTo(10.5, 5);
    expect(kgBySlug["one-arm-dumbbell-row"]).toBeCloseTo(14.4, 5);
  });
});
