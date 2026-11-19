import { dailyTargets, localDateOf } from "@fit/engines";
import { type Day, UserProfile } from "@fit/shared";
import { findMeals } from "./food-entries";
import { findUser } from "./users";
import { findWater } from "./water";

// What a day is worked out from. Onboarding requires all but the Activity Level and the fibre target
const DayProfile = UserProfile.pick({
  gender: true,
  birthYear: true,
  heightCm: true,
  weightKg: true,
  goal: true,
  activityLevel: true,
  fibreTargetG: true,
});

// One local date of the user's eating against their Daily Targets, "today" being today in their timezone. Null before
// onboarding, when there's no profile to work the targets out from. Each later M7 ticket adds its part of the day here
export async function findDay(clerkUserId: string, date: string): Promise<Day | null> {
  const user = await findUser(clerkUserId);
  if (!user?.onboardedAt) return null;
  const localDate = date === "today" ? localDateOf(new Date(), user.timeZone ?? "UTC") : date;
  const { weightKg, ...profile } = DayProfile.parse(user.profile);

  return {
    date: localDate,
    targets: dailyTargets(profile, weightKg, localDate),
    // The totals are worked out from the Food Entries whenever the day is read, never stored
    ...(await findMeals(clerkUserId, localDate)),
    waterMl: await findWater(clerkUserId, localDate),
  };
}
