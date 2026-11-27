import { dayBefore, latestWeekSummaryMonday, mondayBefore, mondayOf, weekDates, weekSummary } from "@fit/engines";
import { DEFAULT_WEIGHT_UNIT, UserProfile, type WeekSummary } from "@fit/shared";
import { findLatestAssessment } from "./assessments";
import { findCheckInsBetween } from "./check-ins";
import { db } from "./db";
import { ignoringDuplicateKey } from "./duplicate-key";
import { findNutritionWeek } from "./nutrition-history";
import { findUser } from "./users";
import { weighInChange } from "./weigh-ins";
import { findWorkoutsSince, toWorkout } from "./workouts";

// The only thing stored for the Week Summary (ADR 0009): that a user has seen a week's, one document per user and week
type SeenDoc = { clerkUserId: string; monday: string; seenAt: Date };

const seenWeeks = db.collection<SeenDoc>("weekSummariesSeen");

export async function ensureWeekSummaryIndexes() {
  await seenWeeks.createIndex({ clerkUserId: 1, monday: 1 }, { unique: true });
}

// Why a Week Summary can't be worked out
export type NoWeekSummary = "not-onboarded" | "no-such-week";

const isMonday = (date: string) => weekDates(date)[0] === date;

// The Week Summary for the Monday-to-Sunday week starting on `monday`, or "latest" for the week just ended, worked out
// live by weekSummary from History, food, Weigh-ins, Check-ins and the Working Levels. A week before the user
// onboarded, or not yet started, has none
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
  const sunday = weekDates(monday)[6];
  const weekBefore = mondayBefore(monday);
  // A day's margin before the onboarding week's Monday covers any timezone
  const since = new Date(`${dayBefore(firstWeek)}T00:00:00Z`);
  const [docs, food, seen, latestAssessment, weighIn, checkIns, checkInsBefore] = await Promise.all([
    findWorkoutsSince(clerkUserId, since),
    findNutritionWeek(clerkUserId, monday),
    seenWeeks.findOne({ clerkUserId, monday }),
    findLatestAssessment(clerkUserId),
    weighInChange(clerkUserId, monday),
    findCheckInsBetween(clerkUserId, monday, sunday),
    findCheckInsBetween(clerkUserId, weekBefore, dayBefore(monday)),
  ]);
  if (!food) return "not-onboarded";
  const summary = weekSummary({
    onboardedAt,
    monday,
    timeZone,
    daysPerWeek,
    goal,
    unit: user.unit ?? DEFAULT_WEIGHT_UNIT,
    workouts: docs.map(toWorkout),
    food,
    latestAssessment,
    weighIn,
    checkIns,
    checkInsBefore,
  });
  return { ...summary, seen: !!seen };
}

// Records that the user has seen the week's summary. Idempotent: the first time is the one kept
export async function markWeekSeen(clerkUserId: string, monday: string): Promise<void> {
  await ignoringDuplicateKey(() =>
    seenWeeks.updateOne({ clerkUserId, monday }, { $setOnInsert: { seenAt: new Date() } }, { upsert: true }),
  );
}
