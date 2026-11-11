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

// A load as the user sees it: in their unit, to the nearest 0.5. 25 lb is stored as 11.3398... kg and shows as 25
export const loadInUnit = (kg: number, unit: WeightUnit) => Math.round(fromKg(kg, unit) * 2) / 2;
