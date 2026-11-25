import { foodIdeas, localDateOf, mealForTimeOfDay } from "@fit/engines";
import { type Day, dietOf } from "@fit/shared";
import { targetsOn } from "./daily-targets";
import { findMeals } from "./food-entries";
import { findUser } from "./users";
import { findWater } from "./water";

// One local date of the user's eating against their Daily Targets, "today" being today in their timezone. Null before
// onboarding, when there's no profile to work the targets out from
export async function findDay(clerkUserId: string, date: string): Promise<Day | null> {
  const user = await findUser(clerkUserId);
  if (!user?.onboardedAt) return null;
  const now = new Date();
  const timeZone = user.timeZone ?? "UTC";
  const localDate = date === "today" ? localDateOf(now, timeZone) : date;
  const targets = await targetsOn(user, localDate);
  // The totals are worked out from the Food Entries whenever the day is read, never stored
  const { meals, totals } = await findMeals(clerkUserId, localDate);

  return {
    date: localDate,
    targets,
    meals,
    totals,
    waterMl: await findWater(clerkUserId, localDate),
    ideas: foodIdeas(dietOf(user.profile), targets.kcal - totals.kcal, targets.proteinG - totals.proteinG),
    ideaMeal: mealForTimeOfDay(now, timeZone),
  };
}
