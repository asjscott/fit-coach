import type { ActivityLevel, Goal } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { dailyTargets, type TargetsProfile } from "./daily-targets";

const TODAY = "2026-11-18";

// 80 kg, 180 cm, 36 on TODAY: BMR 10 × 80 + 6.25 × 180 − 5 × 36 + 5 = 1,750 kcal
const MAN: TargetsProfile = { gender: "male", birthYear: 1990, heightCm: 180, goal: "recomp" };
// 60 kg, 165 cm, 31 on TODAY: BMR 10 × 60 + 6.25 × 165 − 5 × 31 − 161 = 1,315.25 kcal
const WOMAN: TargetsProfile = { gender: "female", birthYear: 1995, heightCm: 165, goal: "recomp" };

describe("dailyTargets", () => {
  // Worked by hand. Calories: maintenance × the Goal, to 10 kcal. Protein 2.0 g/kg (1.6 athletic), fat 0.8 g/kg,
  // carbs the rest ÷ 4, fibre 40 g per 1,000 kcal
  const worked: [string, TargetsProfile, number, ActivityLevel, Goal, Record<string, number>][] = [
    // 1,750 × 1.375 = 2,406.25 maintenance
    ["man", MAN, 80, "lightly_active", "lose_fat", { kcal: 1930, proteinG: 160, fatG: 64, carbsG: 179, fibreG: 77 }],
    ["man", MAN, 80, "lightly_active", "build_muscle", { kcal: 2650, proteinG: 160, carbsG: 359, fibreG: 106 }],
    ["man", MAN, 80, "lightly_active", "recomp", { kcal: 2410, proteinG: 160, carbsG: 299, fibreG: 96 }],
    ["man", MAN, 80, "lightly_active", "athletic", { kcal: 2410, proteinG: 128, carbsG: 331, fibreG: 96 }],
    // 1,315.25 × 1.2 = 1,578.3 maintenance
    ["woman", WOMAN, 60, "sedentary", "lose_fat", { kcal: 1260, proteinG: 120, fatG: 48, carbsG: 87, fibreG: 50 }],
    ["woman", WOMAN, 60, "sedentary", "build_muscle", { kcal: 1740, proteinG: 120, carbsG: 207, fibreG: 70 }],
    ["woman", WOMAN, 60, "sedentary", "recomp", { kcal: 1580, proteinG: 120, carbsG: 167, fibreG: 63 }],
    ["woman", WOMAN, 60, "sedentary", "athletic", { kcal: 1580, proteinG: 96, carbsG: 191, fibreG: 63 }],
  ];

  it.each(worked)("sets a %s at %s kg, %s, to %s", (_, profile, kg, activityLevel, goal, expected) => {
    expect(dailyTargets({ ...profile, goal, activityLevel }, kg, TODAY)).toMatchObject(expected);
  });

  // Maintenance for recomp: 1,750 × 1.2, 1.375, 1.55 and 1.725
  it.each([
    ["sedentary", 2100],
    ["lightly_active", 2410],
    ["active", 2710],
    ["very_active", 3020],
  ] as const)("multiplies the BMR by the Activity Level: %s gives %s kcal", (activityLevel, kcal) => {
    expect(dailyTargets({ ...MAN, activityLevel }, 80, TODAY).kcal).toBe(kcal);
  });

  it("counts a user with no Activity Level as lightly active", () => {
    expect(dailyTargets(MAN, 80, TODAY).kcal).toBe(2410);
  });

  it("takes the user's own fibre target over the rule", () => {
    expect(dailyTargets({ ...MAN, fibreTargetG: 30 }, 80, TODAY).fibreG).toBe(30);
  });

  // 35 ml/kg to the nearest 250 ml: 2,520 → 2,500, 2,625 → 2,750 (halves up), 2,800 → 2,750, 3,150 → 3,250
  it.each([
    [72, 2500],
    [75, 2750],
    [80, 2750],
    [90, 3250],
  ])("sets water at 35 ml/kg to the nearest 250 ml: %s kg gives %s ml", (kg, waterMl) => {
    expect(dailyTargets(MAN, kg, TODAY).waterMl).toBe(waterMl);
  });

  // 250 kg, 120 cm, 96: BMR 2,775, × 1.2 × 0.8 = 2,660 kcal, less than the 500 g of protein and 200 g of fat alone
  it("never sets carbs below 0", () => {
    const heavy: TargetsProfile = { gender: "male", birthYear: 1930, heightCm: 120, goal: "lose_fat" };

    expect(dailyTargets({ ...heavy, activityLevel: "sedentary" }, 250, TODAY)).toMatchObject({ kcal: 2660, carbsG: 0 });
  });

  // 37 in 2027: BMR 1,745, × 1.375 = 2,399.375
  it("counts the age from the birth year and today's year", () => {
    expect(dailyTargets(MAN, 80, "2027-01-01").kcal).toBe(2400);
  });
});
