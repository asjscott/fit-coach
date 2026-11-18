import {
  type ActivityLevel,
  type DailyTargets,
  DEFAULT_ACTIVITY_LEVEL,
  type Goal,
  type UserProfile,
} from "@fit/shared";

// What the Daily Targets are worked out from, besides the body weight
export type TargetsProfile = Pick<UserProfile, "gender" | "birthYear" | "heightCm" | "goal"> &
  Partial<Pick<UserProfile, "activityLevel" | "fibreTargetG">>;

// Maintenance as BMR × the Activity Level, in thousandths so the sums stay exact: 1.2, 1.375, 1.55, 1.725
const ACTIVITY_PER_MILLE: Record<ActivityLevel, number> = {
  sedentary: 1200,
  lightly_active: 1375,
  active: 1550,
  very_active: 1725,
};

// The calories as a percentage of maintenance: a 20% cut, a 10% surplus, or maintenance
const GOAL_PERCENT: Record<Goal, number> = { lose_fat: 80, build_muscle: 110, recomp: 100, athletic: 100 };

const PROTEIN_G_PER_KG: Record<Goal, number> = { lose_fat: 2, build_muscle: 2, recomp: 2, athletic: 1.6 };
const FAT_G_PER_KG = 0.8;
const KCAL_PER_G = { protein: 4, fat: 9, carbs: 4 };
const FIBRE_G_PER_1000_KCAL = 40;
const WATER_ML_PER_KG = 35;
const WATER_STEP_ML = 250;

const toNearest = (value: number, step: number) => Math.round(value / step) * step;

// The user's Daily Targets, the same every day (spec #158). Mifflin-St Jeor × the Activity Level, set by the Goal;
// the macros from the body weight, with carbs filling the rest of the calories. Only the server calls this
export function dailyTargets(profile: TargetsProfile, weightKg: number, today: string): DailyTargets {
  const age = Number(today.slice(0, 4)) - profile.birthYear;
  const bmr = 10 * weightKg + 6.25 * profile.heightCm - 5 * age + (profile.gender === "male" ? 5 : -161);
  const activity = ACTIVITY_PER_MILLE[profile.activityLevel ?? DEFAULT_ACTIVITY_LEVEL];
  const kcal = toNearest((bmr * activity * GOAL_PERCENT[profile.goal]) / 100_000, 10);

  const proteinG = Math.round(PROTEIN_G_PER_KG[profile.goal] * weightKg);
  const fatG = Math.round(FAT_G_PER_KG * weightKg);
  const carbsKcal = kcal - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat;

  return {
    kcal,
    proteinG,
    fatG,
    carbsG: Math.max(0, Math.round(carbsKcal / KCAL_PER_G.carbs)),
    fibreG: profile.fibreTargetG ?? Math.round((kcal * FIBRE_G_PER_1000_KCAL) / 1000),
    waterMl: toNearest(WATER_ML_PER_KG * weightKg, WATER_STEP_ML),
  };
}
