import type { Exercise, SetTarget } from "@fit/shared";
import { BODYWEIGHT_TOP_REPS, isCarry, MAX_REPS, repRange, TIMED_TOP_SECONDS } from "./working-levels";

// The reps or seconds that are valid for a target. No max: any more is fine, as at the top of the bodyweight and timed
// ladders
export type TargetRange = { min: number; max?: number };

// From the target up to the top of its ladder, or with no top once it's there
const ladderRange = (target: number, top: number): TargetRange =>
  target < top ? { min: target, max: top } : { min: target };

// The range shown with a target (#183), stretched to take in a target outside it, as it must never contradict the aim.
// null for a fixed dose, shown as one number
export function targetRange(
  exercise: Pick<Exercise, "patterns" | "equipmentOptions" | "ballistic" | "recovery">,
  target: SetTarget,
): TargetRange | null {
  if (exercise.ballistic || exercise.recovery || isCarry(exercise)) return null;
  if (target.unit === "reps") return ladderRange(target.reps, BODYWEIGHT_TOP_REPS);
  if (target.unit === "seconds") return ladderRange(target.seconds, TIMED_TOP_SECONDS);
  const range = repRange(exercise, target.unit);
  if (!range) return null;
  return { min: Math.min(range.min, target.reps), max: target.reps > range.max ? MAX_REPS : range.max };
}
