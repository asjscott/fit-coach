import type { Muscle } from "@fit/shared";

// Credited Sets per week for each budgeted Muscle; other Muscles are in the Week Ledger but don't drive the plan
export type WeeklyBudget = Partial<Record<Muscle, number>>;

// The build_muscle targets at 4 days per week: see docs/research/weekly-budget-volume.md
const BUILD_MUSCLE_AT_4_DAYS: WeeklyBudget = {
  quads: 16,
  hamstrings: 16,
  glutes: 16,
  chest: 16,
  lats: 16,
  upper_back: 16,
  side_delts: 10,
  abs: 10,
};

export const weeklyBudget = (): WeeklyBudget => BUILD_MUSCLE_AT_4_DAYS;
