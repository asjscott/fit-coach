import type { DailyTargets } from "@fit/shared";

// Both ends are in range
export type NutritionRange = { min: number; max: number };

export type RangeState = {
  state: "below" | "in" | "over";
  // How far below the bottom or over the top; 0 in range
  by: number;
};

// The share of the target, in whole percent so that halves stay exact, to the nearest step
const percentOf = (target: number, percent: number, step: number) =>
  Math.round((target * percent) / (100 * step)) * step;

// The ranges the kcal and protein targets stand for (spec #188): worked out whenever they're needed, never stored
export const nutritionRanges = ({ kcal, proteinG }: Pick<DailyTargets, "kcal" | "proteinG">) => ({
  kcal: nutrientRange("kcal", kcal),
  proteinG: nutrientRange("proteinG", proteinG),
});

// The range one target stands for, such as a week's average target
export function nutrientRange(nutrient: "kcal" | "proteinG", target: number): NutritionRange {
  return nutrient === "kcal"
    ? { min: percentOf(target, 95, 10), max: percentOf(target, 105, 10) }
    : { min: percentOf(target, 90, 1), max: percentOf(target, 120, 1) };
}

// An amount against its range, rounded as it's shown so the words never contradict the numbers
export function rangeState(amount: number, { min, max }: NutritionRange): RangeState {
  const shown = Math.round(amount);
  if (shown < min) return { state: "below", by: min - shown };
  if (shown > max) return { state: "over", by: shown - max };
  return { state: "in", by: 0 };
}
