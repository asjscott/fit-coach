import type { CheckIn } from "@fit/shared";

// From 3 to 15: high is ready to train
export const readiness = ({ sleep, energy, soreness }: CheckIn) => sleep + energy + (6 - soreness);

// The least of the Day's Workout's Sets a check-in keeps
export const LIGHTEST_SHARE = 0.7;

// The share of the Day's Workout's Sets to keep after the check-in: everything without one. Soreness 5 keeps at most
// 0.85, however good sleep and energy were (#112)
export function readinessShare(checkIn: CheckIn | null | undefined) {
  if (!checkIn) return 1;
  const score = readiness(checkIn);
  if (score <= 6) return LIGHTEST_SHARE;
  return score <= 9 || checkIn.soreness === 5 ? 0.85 : 1;
}
