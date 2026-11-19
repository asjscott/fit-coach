import { dailyTargets, foodIdeas, localDateOf, mealForTimeOfDay } from "@fit/engines";
import { DEFAULT_DIET, type Day, UserProfile } from "@fit/shared";
import { findMeals } from "./food-entries";
import { findUser } from "./users";
import { findWater } from "./water";

// What a day is worked out from. Onboarding requires all but the Activity Level, the fibre target and the Diet
const DayProfile = UserProfile.pick({
  gender: true,
  birthYear: true,
  heightCm: true,
  weightKg: true,
  goal: true,
  activityLevel: true,
  fibreTargetG: true,
  diet: true,
});

// One local date of the user's eating against their Daily Targets, "today" being today in their timezone. Null before
// onboarding, when there's no profile to work the targets out from
export async function findDay(clerkUserId: string, date: string): Promise<Day | null> {
  const user = await findUser(clerkUserId);
  if (!user?.onboardedAt) return null;
  const now = new Date();
  const timeZone = user.timeZone ?? "UTC";
  const localDate = date === "today" ? localDateOf(now, timeZone) : date;
  const { weightKg, diet = DEFAULT_DIET, ...profile } = DayProfile.parse(user.profile);
  const targets = dailyTargets(profile, weightKg, localDate);
  // The totals are worked out from the Food Entries whenever the day is read, never stored
  const { meals, totals } = await findMeals(clerkUserId, localDate);

  return {
    date: localDate,
    targets,
    meals,
    totals,
    waterMl: await findWater(clerkUserId, localDate),
    ideas: foodIdeas(diet, targets.kcal - totals.kcal, targets.proteinG - totals.proteinG),
    ideaMeal: mealForTimeOfDay(now, timeZone),
  };
}
