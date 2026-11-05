import type { WorkingLevel } from "@fit/shared";
import { describe, expect, it } from "vitest";
import type { ProfileWithLoads } from "./equipment";
import { planWorkout, type PlanWorkoutInput } from "./plan-workout";

const dumbbells: ProfileWithLoads = {
  tags: ["dumbbells"],
  loads: { dumbbells: { kind: "adjustable", minKg: 2.5, maxKg: 40, stepKg: 2.5 } },
};

const kg = (slug: string, level: number): WorkingLevel => ({ slug, unit: "kg", kg: level });
const reps = (slug: string, level: number): WorkingLevel => ({ slug, unit: "reps", reps: level });

// All fit a dumbbell profile
const levels: WorkingLevel[] = [
  kg("goblet-squat", 20.3),
  kg("dumbbell-romanian-deadlift", 30),
  kg("one-arm-dumbbell-row", 18),
  reps("push-up", 12),
  kg("dumbbell-lateral-raise", 6),
  { slug: "plank", unit: "seconds", seconds: 40.4 },
];

const plan = (more: Partial<PlanWorkoutInput> = {}) =>
  planWorkout({
    workouts: [],
    now: new Date("2026-11-04T12:00:00Z"),
    timeZone: "America/New_York",
    equipmentProfile: dumbbells,
    injuries: [],
    workingLevels: levels,
    ...more,
  });

const slugs = (more?: Partial<PlanWorkoutInput>) => plan(more).plannedExercises.map(({ slug }) => slug);

// Sets of an Exercise logged this week
const logged = (id: string, slug: string, sets: number) => ({
  id,
  startedAt: "2026-11-03T18:00:00.000Z",
  workoutExercises: [{ slug, sets: Array.from({ length: sets }, () => ({})) }],
});

describe("planWorkout", () => {
  describe("choosing Exercises", () => {
    it("picks the highest score again and again, counting each pick towards the budget", () => {
      // Scores (credit × remaining ÷ budget, × 1.15 for external load), budgets 16 and 10 for side_delts and abs:
      // goblet squat 2.875; row, RDL 2.3; push-up, plank 1.5; lateral raise 1.15. Then, after each pick:
      // goblet squat: RDL 2.084 (glutes 13/16), push-up 1.425, plank 1.256
      // row: unchanged
      // RDL: push-up 1.425, lateral raise 1.15, plank 1.163 (glutes 10/16)
      // push-up: lateral raise 1.15, plank 1.0125 (abs 7/10)
      expect(slugs()).toEqual([
        "goblet-squat",
        "one-arm-dumbbell-row",
        "dumbbell-romanian-deadlift",
        "push-up",
        "dumbbell-lateral-raise",
        "plank",
      ]);
    });

    it("plans around the Sets logged this week", () => {
      // 16 Sets of goblet squat fill quads and glutes, so what's left of its score is abs: 0.5 × 0.2 × 1.15
      const workouts = [logged("w1", "goblet-squat", 16)];
      const chosen = slugs({ workouts });
      expect(chosen[0]).toBe("one-arm-dumbbell-row");
      expect(chosen.at(-1)).toBe("goblet-squat");
    });

    it("gives each Exercise once", () => {
      const chosen = slugs();
      expect(new Set(chosen).size).toBe(chosen.length);
    });

    it("builds the Long version, stopping at 55 minutes of Sets", () => {
      // Ten Exercises at 120 s a Set, so 6 minutes a pick: 9 fit and a tenth would reach 60 minutes
      const workingLevels = [
        "single-arm-overhead-press",
        "goblet-squat",
        "dumbbell-romanian-deadlift",
        "dumbbell-overhead-press",
        "dumbbell-reverse-lunge",
        "dumbbell-single-leg-romanian-deadlift",
        "suitcase-carry",
        "front-rack-carry",
        "renegade-row",
        "farmers-carry",
      ].map((slug) => kg(slug, 20));
      expect(slugs({ workingLevels })).toHaveLength(9);
    });
  });

  describe("equipment and injuries", () => {
    it("leaves out an Exercise the Equipment Profile can't do", () => {
      expect(slugs({ workingLevels: [kg("back-squat", 60), kg("goblet-squat", 20)] })).toEqual(["goblet-squat"]);
    });

    it("leaves out an Exercise that conflicts with an injury", () => {
      expect(slugs({ injuries: ["knee"] })).not.toContain("goblet-squat");
    });

    it("leaves out an Exercise with no stored Working Level", () => {
      expect(slugs({ workingLevels: [kg("goblet-squat", 20)] })).toEqual(["goblet-squat"]);
    });

    it("leaves out a barbell Exercise whose Working Level is lighter than the bar", () => {
      const barbell: ProfileWithLoads = {
        tags: ["barbell", "plates", "power_rack"],
        loads: { barbell: { barKg: 20, platesKg: [2.5, 5, 10] } },
      };
      const chosen = slugs({ equipmentProfile: barbell, workingLevels: [kg("back-squat", 15), kg("deadlift", 60)] });
      expect(chosen).toEqual(["deadlift"]);
    });

    it("has no Exercises when nothing can be prescribed", () => {
      expect(slugs({ workingLevels: [] })).toEqual([]);
    });
  });

  describe("Set targets", () => {
    const planned = (slug: string, more?: Parameters<typeof plan>[0]) =>
      plan(more).plannedExercises.find((exercise) => exercise.slug === slug);

    it("gives every Exercise 3 Sets", () => {
      expect(plan().plannedExercises.map(({ sets }) => sets)).toEqual([3, 3, 3, 3, 3, 3]);
    });

    it("prescribes a weighted Exercise's Working Level at the nearest load the profile has, for 8 reps", () => {
      expect(planned("goblet-squat")?.target).toEqual({ unit: "kg", kg: 20, reps: 8 });
    });

    it("prescribes a weighted Exercise to the nearest 0.5 kg when the loads aren't known", () => {
      const equipmentProfile: ProfileWithLoads = { tags: ["dumbbells"], loads: {} };
      expect(planned("goblet-squat", { equipmentProfile })?.target).toEqual({ unit: "kg", kg: 20.5, reps: 8 });
    });

    it("prescribes a bodyweight Exercise's reps", () => {
      expect(planned("push-up")?.target).toEqual({ unit: "reps", reps: 12 });
    });

    it("prescribes a timed Exercise's seconds, whole", () => {
      expect(planned("plank")?.target).toEqual({ unit: "seconds", seconds: 40 });
    });

    it("prescribes a band Exercise's level and reps", () => {
      const workingLevels: WorkingLevel[] = [
        { slug: "dumbbell-lateral-raise", unit: "band", level: "medium", reps: 12 },
      ];
      const equipmentProfile: ProfileWithLoads = { tags: ["loop_bands"], loads: {} };
      expect(planned("dumbbell-lateral-raise", { workingLevels, equipmentProfile })?.target).toEqual({
        unit: "band",
        level: "medium",
        reps: 12,
      });
    });
  });

  it("tags the plan with the Monday of its week in the user's timezone", () => {
    // Monday 04:30 UTC is still Sunday in New York
    const lateSunday = new Date("2026-11-02T04:30:00Z");
    expect(plan({ now: lateSunday }).weekStart).toBe("2026-10-26");
    expect(plan({ now: lateSunday, timeZone: "UTC" }).weekStart).toBe("2026-11-02");
  });

  it("gives the same plan for the same inputs", () => {
    const workouts = [logged("w1", "goblet-squat", 3)];
    expect(plan({ workouts })).toEqual(plan({ workouts }));
  });

  it("doesn't depend on the order of its inputs", () => {
    const workouts = [logged("w1", "goblet-squat", 3), logged("w2", "push-up", 3)];
    const reordered = plan({ workouts: [...workouts].reverse(), workingLevels: [...levels].reverse() });
    expect(reordered).toEqual(plan({ workouts }));
  });

  it("breaks a tie the same way every time", () => {
    // Identical Muscles and Load Type, so identical scores
    const workingLevels = [reps("split-squat", 10), reps("reverse-lunge", 10)];
    expect(slugs({ workingLevels })).toEqual(slugs({ workingLevels: [...workingLevels].reverse() }));
  });
});
