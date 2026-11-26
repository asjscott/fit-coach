import {
  dayBefore,
  latestWeekSummaryMonday,
  localDateOf,
  mondayOf,
  nutritionRanges,
  rangeState,
  weekDates,
  weekLedger,
  weeklyBudget,
  weeklyStreak,
  workoutsInWeek,
  type LedgerWorkout,
} from "@fit/engines";
import { UserProfile, type NutritionWeek, type WeekAverage, type WeekSummary } from "@fit/shared";
import { db } from "./db";
import { ignoringDuplicateKey } from "./duplicate-key";
import { findNutritionWeek } from "./nutrition-history";
import { findUser } from "./users";
import { findWorkoutsSince, toWorkout } from "./workouts";

// The only thing stored for the Week Summary (ADR 0009): that a user has seen a week's, one document per user and week
type SeenDoc = { clerkUserId: string; monday: string; seenAt: Date };

const seenWeeks = db.collection<SeenDoc>("weekSummariesSeen");

export async function ensureWeekSummaryIndexes() {
  await seenWeeks.createIndex({ clerkUserId: 1, monday: 1 }, { unique: true });
}

// Why a Week Summary can't be worked out
export type NoWeekSummary = "not-onboarded" | "no-such-week";

// Everything a week's parts are worked out from, fetched once
type WeekData = {
  monday: string;
  onboardedAt: Date;
  timeZone: string;
  daysPerWeek: number;
  goal: UserProfile["goal"];
  // From the onboarding week on, for the Weekly Streak
  workouts: LedgerWorkout[];
  food: NutritionWeek;
};

// Weekly Streak, at a moment inside the week, so the week counts as the one under way: its own Workouts add to it. A
// week that ended short broke the streak, which the current week never does, so that's 0
function streakOf({ onboardedAt, monday, timeZone, daysPerWeek, workouts }: WeekData, done: number): number {
  if (done < daysPerWeek - 1) return 0;
  const inside = momentOn(weekDates(monday)[6], timeZone);
  return weeklyStreak({ workouts, daysPerWeek, onboardedAt: onboardedAt.toISOString(), now: inside, timeZone });
}

// A moment on a local date in the timezone: noon UTC, moved half a day when that's another date there
function momentOn(date: string, timeZone: string): Date {
  const noon = new Date(`${date}T12:00:00Z`);
  const there = localDateOf(noon, timeZone);
  if (there === date) return noon;
  return new Date(noon.getTime() + (there > date ? -12 : 12) * 60 * 60 * 1000);
}

// Workouts planned: days per week, pro-rated for the part first week from the day the user onboarded, at least one
function plannedWorkouts({ onboardedAt, monday, timeZone, daysPerWeek }: WeekData, partWeek: boolean): number {
  if (!partWeek) return daysPerWeek;
  const onboarded = localDateOf(onboardedAt, timeZone);
  const days = weekDates(monday).filter((date) => date >= onboarded).length;
  return Math.max(1, Math.round((daysPerWeek * days) / 7));
}

// The daily average over the days with food logged, against the range of their average target; null with none logged
function averageOf(food: NutritionWeek, nutrient: "kcal" | "proteinG"): WeekAverage | undefined {
  const logged = food.days.filter((day) => day.logged);
  if (!logged.length) return undefined;
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const average = Math.round(mean(logged.map((day) => day.totals[nutrient])));
  const target = mean(logged.map((day) => day.targets[nutrient]));
  const range = nutritionRanges({ kcal: target, proteinG: target })[nutrient];
  return { average, ...range, state: rangeState(average, range).state };
}

// Budgeted Muscles at or over their Weekly Budget, out of all of them; absent with no Workouts to credit
function budgetMet({ goal, daysPerWeek, workouts, monday, timeZone }: WeekData, done: number) {
  if (!done) return undefined;
  const budget = weeklyBudget(goal, daysPerWeek);
  const ledger = weekLedger(workouts, { monday, timeZone });
  const muscles = Object.entries(budget) as [keyof typeof budget, number][];
  return { met: muscles.filter(([muscle, sets]) => (ledger[muscle] ?? 0) >= sets).length, muscles: muscles.length };
}

// The model, part by part. A new part is worked out here from WeekData, and left out when it has no data
function weekSummaryOf(data: WeekData, seen: boolean): WeekSummary {
  const { onboardedAt, monday, timeZone, workouts, food } = data;
  const partWeek = mondayOf(onboardedAt, timeZone) === monday;
  const done = workoutsInWeek(workouts, { monday, timeZone }).length;
  const kcal = averageOf(food, "kcal");
  const protein = averageOf(food, "proteinG");
  const weeklyBudget = budgetMet(data, done);
  return {
    monday,
    sunday: weekDates(monday)[6],
    seen,
    partWeek,
    workouts: { done, planned: plannedWorkouts(data, partWeek) },
    streak: streakOf(data, done),
    ...(kcal && { kcal }),
    ...(protein && { protein }),
    ...(weeklyBudget && { weeklyBudget }),
  };
}

const isMonday = (date: string) => weekDates(date)[0] === date;

// The Week Summary for the Monday-to-Sunday week starting on `monday`, or "latest" for the week just ended, worked out
// live from History and food. A week before the user onboarded, or not yet started, has none
export async function findWeekSummary(clerkUserId: string, requested: string): Promise<WeekSummary | NoWeekSummary> {
  const user = await findUser(clerkUserId);
  const onboardedAt = user?.onboardedAt;
  if (!user || !onboardedAt) return "not-onboarded";
  const timeZone = user.timeZone ?? "UTC";
  const now = new Date();
  const monday = requested === "latest" ? latestWeekSummaryMonday(now, timeZone) : requested;
  const firstWeek = mondayOf(onboardedAt, timeZone);
  if (!isMonday(monday) || monday < firstWeek || monday > mondayOf(now, timeZone)) return "no-such-week";

  const { goal, daysPerWeek } = UserProfile.pick({ goal: true, daysPerWeek: true }).required().parse(user.profile);
  // A day's margin before the onboarding week's Monday covers any timezone
  const since = new Date(`${dayBefore(firstWeek)}T00:00:00Z`);
  const [docs, food, seen] = await Promise.all([
    findWorkoutsSince(clerkUserId, since),
    findNutritionWeek(clerkUserId, monday),
    seenWeeks.findOne({ clerkUserId, monday }),
  ]);
  if (!food) return "not-onboarded";
  const data = { onboardedAt, monday, timeZone, daysPerWeek, goal, workouts: docs.map(toWorkout), food };
  return weekSummaryOf(data, !!seen);
}

// Records that the user has seen the week's summary. Idempotent: the first time is the one kept
export async function markWeekSeen(clerkUserId: string, monday: string): Promise<void> {
  await ignoringDuplicateKey(() =>
    seenWeeks.updateOne({ clerkUserId, monday }, { $setOnInsert: { seenAt: new Date() } }, { upsert: true }),
  );
}
