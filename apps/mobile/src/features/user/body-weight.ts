import { fromKg, toKg, UserProfile, type WeightUnit } from "@fit/shared";
import { z } from "zod";

// Body weight follows "Weights in" like every load, and is stored in kg (#148). It shows to a tenth, so a weight
// entered in either unit reads back as entered: 180 lb is stored as its exact kg and shows as 180
export const bodyWeightInUnit = (kg: number, unit: WeightUnit) => Math.round(fromKg(kg, unit) * 10) / 10;

// A body weight answered in the user's unit as kg to store: its exact kg, or the stored kg when the answer is the
// one shown for it, so editing the profile without touching the weight never nudges it (80 kg shows as 176.4 lb)
export function bodyWeightKg(answer: number, unit: WeightUnit, storedKg?: number) {
  if (storedKg != null && answer === bodyWeightInUnit(storedKg, unit)) return storedKg;
  return toKg(answer, unit);
}

// The profile's body weight range, in kg
const { minValue: MIN_KG, maxValue: MAX_KG } = UserProfile.shape.weightKg;

// A body weight answered in the user's unit: whole numbers inside the profile's kg range, so every answer it takes
// saves (78–551 lb, 35–250 kg)
export function bodyWeightAnswer(unit: WeightUnit) {
  const min = Math.ceil(fromKg(MIN_KG ?? 0, unit));
  const max = Math.floor(fromKg(MAX_KG ?? Infinity, unit));
  return z
    .number({ error: "Enter your weight" })
    .min(min, `Must be ${min} ${unit} or more`)
    .max(max, `Must be ${max} ${unit} or less`);
}
