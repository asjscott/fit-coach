import type { Goal } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { exerciseBySlug } from "./data/exercises";
import { scoreExercise, type WeekSoFar } from "./plan-score";

const exercise = (slug: string) => exerciseBySlug(slug)!;

const fullBudget = {
  quads: 16,
  hamstrings: 16,
  glutes: 16,
  chest: 16,
  lats: 16,
  upper_back: 16,
  side_delts: 10,
  abs: 10,
};
const nothingDone: WeekSoFar = { goal: "build_muscle", budget: fullBudget, ledger: {} };

describe("scoreExercise", () => {
  it("adds credit × remaining ÷ budget over the budgeted Muscles", () => {
    // Bodyweight squat: quads 1, glutes 1; adductors and calves aren't budgeted
    expect(scoreExercise(exercise("bodyweight-squat"), nothingDone)).toBeCloseTo(2);
  });

  it("counts a secondary Muscle at half", () => {
    // Push-up: chest 1 primary, abs 0.5 secondary; triceps and front_delts aren't budgeted
    expect(scoreExercise(exercise("push-up"), nothingDone)).toBeCloseTo(1.5);
  });

  it("weighs a Muscle by how far behind it is", () => {
    // Quads 12 of 16 done leaves a quarter, glutes untouched: 0.25 + 1
    const score = scoreExercise(exercise("bodyweight-squat"), { ...nothingDone, ledger: { quads: 12 } });
    expect(score).toBeCloseTo(1.25);
  });

  it("gives nothing for a Muscle past its budget", () => {
    const score = scoreExercise(exercise("bodyweight-squat"), { ...nothingDone, ledger: { quads: 20 } });
    expect(score).toBeCloseTo(1);
  });

  it("prefers external load by 1.15", () => {
    // Goblet squat: quads 1, glutes 1, abs 0.5, then × 1.15
    expect(scoreExercise(exercise("goblet-squat"), nothingDone)).toBeCloseTo(2.875);
  });

  it("prefers an Exercise that needs a barbell by 1.02", () => {
    // Back squat: quads 1, glutes 1, abs 0.5, then × 1.15 × 1.02
    expect(scoreExercise(exercise("back-squat"), nothingDone)).toBeCloseTo(2.9325);
  });

  it("breaks the tie between back squat and goblet squat", () => {
    const backSquat = scoreExercise(exercise("back-squat"), nothingDone);
    expect(backSquat).toBeGreaterThan(scoreExercise(exercise("goblet-squat"), nothingDone));
  });

  it("is 0 for an Exercise training no budgeted Muscle", () => {
    const score = scoreExercise(exercise("goblet-squat"), {
      ...nothingDone,
      ledger: { quads: 16, glutes: 16, abs: 10 },
    });
    expect(score).toBe(0);
  });

  describe("the Goal factor", () => {
    const forGoal = (goal: Goal) => ({ ...nothingDone, goal });

    it.each(["build_muscle", "recomp"] as const)("doesn't tilt %s", (goal) => {
      // Kettlebell swing: glutes 1, hamstrings 1, upper_back 0.5, then × 1.15 and no more for being Ballistic
      expect(scoreExercise(exercise("kettlebell-swing"), forGoal(goal))).toBeCloseTo(2.875);
    });

    it("prefers a Ballistic Exercise by 1.25 for athletic", () => {
      // 2.875 × 1.25
      expect(scoreExercise(exercise("kettlebell-swing"), forGoal("athletic"))).toBeCloseTo(3.594);
    });

    it("doesn't tilt anything else for athletic", () => {
      expect(scoreExercise(exercise("goblet-squat"), forGoal("athletic"))).toBeCloseTo(2.875);
    });

    it("leaves an Exercise of 105 seconds a Set alone for lose_fat", () => {
      // Push-up: chest 1, abs 0.5
      const atReference = { ...exercise("push-up"), secondsPerSet: 105 };
      expect(scoreExercise(atReference, forGoal("lose_fat"))).toBeCloseTo(1.5);
    });

    it("tilts lose_fat softly by time", () => {
      // 1.5 × sqrt(105 / 100)
      const quick = { ...exercise("push-up"), secondsPerSet: 100 };
      expect(scoreExercise(quick, forGoal("lose_fat"))).toBeCloseTo(1.537);
    });

    it("limits lose_fat's tilt to 10% either way", () => {
      const quickest = { ...exercise("push-up"), secondsPerSet: 60 };
      const slowest = { ...exercise("push-up"), secondsPerSet: 180 };
      expect(scoreExercise(quickest, forGoal("lose_fat"))).toBeCloseTo(1.65);
      expect(scoreExercise(slowest, forGoal("lose_fat"))).toBeCloseTo(1.35);
    });
  });
});
