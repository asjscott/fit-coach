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

function currentTargets(user: OnboardedDoc, date: string): DailyTargets {
  const { weightKg, ...profile } = TargetsProfile.parse(user.profile);
  return dailyTargets(profile, weightKg, date);
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

// The date's Daily Targets: today's as they are now, a past day's as they last were, and the current ones for a past
// day with none stored or a day to come
export async function targetsOn(user: OnboardedDoc, date: string): Promise<DailyTargets> {
  const today = todayOf(user);
  if (date === today) await keepTodaysTargets(user.clerkUserId);
  const kept = date <= today ? await keptTargets.findOne({ clerkUserId: user.clerkUserId, date }) : null;
  return kept?.targets ?? currentTargets(user, date);
}
