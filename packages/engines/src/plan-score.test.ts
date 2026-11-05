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
const nothingDone: WeekSoFar = { budget: fullBudget, ledger: {} };

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
    const score = scoreExercise(exercise("bodyweight-squat"), { budget: fullBudget, ledger: { quads: 12 } });
    expect(score).toBeCloseTo(1.25);
  });

  it("gives nothing for a Muscle past its budget", () => {
    const score = scoreExercise(exercise("bodyweight-squat"), { budget: fullBudget, ledger: { quads: 20 } });
    expect(score).toBeCloseTo(1);
  });

  it("prefers external load by 1.15", () => {
    // Goblet squat: quads 1, glutes 1, abs 0.5, then × 1.15
    expect(scoreExercise(exercise("goblet-squat"), nothingDone)).toBeCloseTo(2.875);
  });

  it("is 0 for an Exercise training no budgeted Muscle", () => {
    const score = scoreExercise(exercise("goblet-squat"), {
      budget: fullBudget,
      ledger: { quads: 16, glutes: 16, abs: 10 },
    });
    expect(score).toBe(0);
  });
});
