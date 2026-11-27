import { localDateOf, mondayBefore, mondayOf } from "./week-ledger";

// The Weekly Streak (GLOSSARY.md), for This week and the Week Summary alike, so the two always agree
export type WeeklyStreakInput = {
  // History with the Pending Workouts. Recovery Workouts count like any other
  workouts: readonly { startedAt: string }[];
  // The current days per week judges every week: past values aren't stored
  daysPerWeek: number;
  // The user's onboardedAt
  onboardedAt: string;
  now: Date;
  timeZone: string;
};

// The Monday of the partial first week, the one the user onboarded in after its Monday in their timezone, or null when
// they onboarded on a Monday and had the whole week. The Weekly Streak skips it and the Week Summary pro-rates it
export function partFirstWeek(onboardedAt: string | Date, timeZone: string): string | null {
  const onboarded = new Date(onboardedAt);
  const monday = mondayOf(onboarded, timeZone);
  return localDateOf(onboarded, timeZone) === monday ? null : monday;
}

// Walks back from the week holding `now`: the weeks in the streak, and the Monday of the week it stopped at
function streakWeeks({ workouts, daysPerWeek, onboardedAt, now, timeZone }: WeeklyStreakInput) {
  const needed = daysPerWeek - 1;
  const counts = new Map<string, number>();
  for (const { startedAt } of workouts) {
    const monday = mondayOf(new Date(startedAt), timeZone);
    counts.set(monday, (counts.get(monday) ?? 0) + 1);
  }
  const reached = (monday: string) => (counts.get(monday) ?? 0) >= needed;

  // The last week not looked at: the partial first week, or the one before a whole first week
  const notCounted = partFirstWeek(onboardedAt, timeZone) ?? mondayBefore(mondayOf(new Date(onboardedAt), timeZone));
  const thisWeek = mondayOf(now, timeZone);
  if (thisWeek <= notCounted) return { weeks: 0, stoppedAt: notCounted };
  let weeks = reached(thisWeek) ? 1 : 0;
  let monday = mondayBefore(thisWeek);
  for (; monday > notCounted && reached(monday); monday = mondayBefore(monday)) weeks += 1;
  return { weeks, stoppedAt: monday };
}

// Weeks in a row, Monday to Sunday in the user's timezone, with at least one fewer Workout than days per week.
// The current week, the one holding `now`, adds once it reaches the number, and never breaks the streak while it's
// under way; weeks after it aren't looked at. The partial first week (partFirstWeek) is skipped: it neither counts nor
// breaks it. A first week the user had whole counts like any other. There are no freezes
export const weeklyStreak = (input: WeeklyStreakInput): number => streakWeeks(input).weeks;

// The Monday of the oldest week the streak looks at: the week that broke it, or the week before the first one it
// counts. The phone loads History back past the start of this week, so the streak it works out is whole
export const weeklyStreakSince = (input: WeeklyStreakInput): string => streakWeeks(input).stoppedAt;
