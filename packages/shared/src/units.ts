import { z } from "zod";

// The unit the user sees loads in. The server stores kg only: a load entered in pounds is kept as its exact kg
export const WeightUnit = z.enum(["lb", "kg"]);
export type WeightUnit = z.infer<typeof WeightUnit>;

// For existing and new users alike, as the gyms the app is built for are in pounds
export const DEFAULT_WEIGHT_UNIT: WeightUnit = "lb";

// The international pound, exactly
export const KG_PER_LB = 0.45359237;

const KG_PER_UNIT: Record<WeightUnit, number> = { lb: KG_PER_LB, kg: 1 };

// A load the user entered in their unit as its exact kg, never rounded, so it reads back as entered
export const toKg = (value: number, unit: WeightUnit) => value * KG_PER_UNIT[unit];

// kg in the user's unit, unrounded: for totals such as Volume, which round their own way
export const fromKg = (kg: number, unit: WeightUnit) => kg / KG_PER_UNIT[unit];

// kg in the user's unit to the nearest step, such as 0.5 or 0.1. Rounded in whole steps per unit, so 0.1 gives 176.4
// rather than 176.40000000000001
export function inUnitToStep(kg: number, unit: WeightUnit, step: number) {
  const stepsPerUnit = Math.round(1 / step);
  return Math.round(fromKg(kg, unit) * stepsPerUnit) / stepsPerUnit;
}

// A load as the user sees it: one sized in their unit as it is, so 25 lb, stored as 11.3398... kg, shows as 25 and 5.75
// as 5.75 (#176); one sized in the other, to the nearest 0.5, so a 20 kg kettlebell shows as 44 lb
export function loadInUnit(kg: number, unit: WeightUnit) {
  const exact = inUnitToStep(kg, unit, 0.001);
  return Math.abs(fromKg(kg, unit) - exact) < 1e-6 ? exact : inUnitToStep(kg, unit, 0.5);
}
