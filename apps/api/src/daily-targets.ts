import { isDeepStrictEqual } from "node:util";
import { dailyTargets, localDateOf } from "@fit/engines";
import { type DailyTargets, UserProfile } from "@fit/shared";
import { db } from "./db";
import { upsertRacing } from "./duplicate-key";
import { findUser } from "./users";

// The shape of a daily targets document in MongoDB: the last Daily Targets a user's local date had (spec #188)
type DailyTargetsDoc = { clerkUserId: string; date: string; targets: DailyTargets; updatedAt: Date };

const keptTargets = db.collection<DailyTargetsDoc>("dailyTargets");

export async function ensureDailyTargetsIndexes() {
  // One set of targets per user per local date
  await keptTargets.createIndex({ clerkUserId: 1, date: 1 }, { unique: true });
}

// What the targets are worked out from. Onboarding requires all but the Activity Level and the fibre target
const TargetsProfile = UserProfile.pick({
  gender: true,
  birthYear: true,
  heightCm: true,
  weightKg: true,
  goal: true,
  activityLevel: true,
  fibreTargetG: true,
});

type OnboardedDoc = NonNullable<Awaited<ReturnType<typeof findUser>>>;

const todayOf = (user: OnboardedDoc) => localDateOf(new Date(), user.timeZone ?? "UTC");

function currentTargets(user: OnboardedDoc, today: string): DailyTargets {
  const { weightKg, ...profile } = TargetsProfile.parse(user.profile);
  return dailyTargets(profile, weightKg, today);
}

// Stores today's Daily Targets, today being today in the user's timezone, so they stand once the day is over. Called
// whenever today is read, food is logged to it, or something the targets depend on changes. Nothing before onboarding
export async function keepTodaysTargets(clerkUserId: string): Promise<void> {
  const latest = async () => {
    const user = await findUser(clerkUserId);
    if (!user?.onboardedAt) return null;
    const date = todayOf(user);
    return { date, targets: currentTargets(user, date) };
  };
  let today = await latest();
  while (today) {
    const { date, targets } = today;
    await upsertRacing(() =>
      keptTargets.updateOne({ clerkUserId, date }, { $set: { targets, updatedAt: new Date() } }, { upsert: true }),
    );
    // A change made since the user was read may have stored its targets before these replaced them
    const now = await latest();
    if (isDeepStrictEqual(now, today)) return;
    today = now;
  }
}

// The date's Daily Targets: today's as they are now, a past day's as they last were (the nearest earlier stored day's
// when it has none of its own), and the current ones for a past day before any were stored or a day to come
export async function targetsOn(user: OnboardedDoc, date: string): Promise<DailyTargets> {
  return (await targetsOnDates(user, [date]))[0];
}

// The same for several dates, in their order
export async function targetsOnDates(user: OnboardedDoc, dates: string[]): Promise<DailyTargets[]> {
  const today = todayOf(user);
  if (dates.includes(today)) await keepTodaysTargets(user.clerkUserId);
  const past = dates.filter((date) => date <= today).sort();
  if (!past.length) return dates.map(() => currentTargets(user, today));
  const { clerkUserId } = user;
  const [before, within] = await Promise.all([
    keptTargets.findOne({ clerkUserId, date: { $lt: past[0] } }, { sort: { date: -1 } }),
    keptTargets
      .find({ clerkUserId, date: { $gte: past[0], $lte: past[past.length - 1] } })
      .sort({ date: -1 })
      .toArray(),
  ]);
  // Newest first
  const kept = before ? [...within, before] : within;
  return dates.map((date) => {
    const nearest = date <= today ? kept.find((doc) => doc.date <= date) : undefined;
    return nearest?.targets ?? currentTargets(user, today);
  });
}
