import { localDateOf, weekDates } from "@fit/engines";
import type { NutritionWeek } from "@fit/shared";
import { targetsOnDates } from "./daily-targets";
import { findTotals, firstLoggedDate } from "./food-entries";
import { findUser } from "./users";

// The Monday to Sunday week a local date is in, "today" being today in the user's timezone. Null before onboarding, as
// for a day
export async function findNutritionWeek(clerkUserId: string, date: string): Promise<NutritionWeek | null> {
  const user = await findUser(clerkUserId);
  if (!user?.onboardedAt) return null;
  const today = localDateOf(new Date(), user.timeZone ?? "UTC");
  const dates = weekDates(date === "today" ? today : date);
  const [targets, totals, first] = await Promise.all([
    targetsOnDates(user, dates),
    findTotals(clerkUserId, dates),
    firstLoggedDate(clerkUserId),
  ]);
  return {
    today,
    firstLoggedDate: first,
    days: dates.map((day, i) => ({
      date: day,
      totals: totals.get(day) ?? { kcal: 0, proteinG: 0 },
      targets: targets[i],
      logged: totals.has(day),
    })),
  };
}
