import { z } from "zod";

// A rating from 1 to 5: sleep and energy from poor to great, soreness from none to very
export const CheckInRating = z.number().int().min(1).max(5);

// How the user feels today, before training
export const CheckIn = z.object({ sleep: CheckInRating, energy: CheckInRating, soreness: CheckInRating });
export type CheckIn = z.infer<typeof CheckIn>;

// From 3 to 15: high is ready to train
export const readiness = ({ sleep, energy, soreness }: CheckIn) => sleep + energy + (6 - soreness);

// The share of the Day's Workout's Sets to keep after the check-in: everything without one
export function readinessShare(checkIn: CheckIn | null | undefined) {
  if (!checkIn) return 1;
  const score = readiness(checkIn);
  if (score <= 6) return 0.7;
  return score <= 9 ? 0.85 : 1;
}
