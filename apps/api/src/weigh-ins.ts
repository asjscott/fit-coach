import { localDateOf, mondayOf, mondayOfDate } from "@fit/engines";
import type { WeighIn } from "@fit/shared";
import { db } from "./db";
import { ignoringDuplicateKey, upsertRacing } from "./duplicate-key";
import { users } from "./users";

// The shape of a Weigh-in document in MongoDB: one per user per week, keyed by the week's Monday in their timezone
type WeighInDoc = WeighIn & { clerkUserId: string; week: string; loggedAt: Date };

const weighIns = db.collection<WeighInDoc>("weighIns");

export async function ensureWeighInIndexes() {
  // At most one Weigh-in per user per week
  await weighIns.createIndex({ clerkUserId: 1, week: 1 }, { unique: true });
}

// What the user's record says about their Weigh-ins
export type WeighInSummary = { latestWeighIn: WeighIn | null; weighedInThisWeek: boolean };

export async function weighInSummary(clerkUserId: string, timeZone: string): Promise<WeighInSummary> {
  const latest = await latestWeighIn(clerkUserId);
  return {
    latestWeighIn: latest && { date: latest.date, kg: latest.kg },
    weighedInThisWeek: latest?.week === mondayOf(new Date(), timeZone),
  };
}

const latestWeighIn = (clerkUserId: string) => weighIns.findOne({ clerkUserId }, { sort: { week: -1 } });

// Stores the Weigh-in for the date's week, replacing any the week already has, then keeps the profile's weight at the
// latest Weigh-in's, which is what the Assessment and the Daily Targets read
export async function keepWeighIn(clerkUserId: string, date: string, kg: number) {
  await upsertRacing(() =>
    weighIns.updateOne(
      { clerkUserId, week: mondayOfDate(date) },
      { $set: { date, kg, loggedAt: new Date() } },
      { upsert: true },
    ),
  );
  const latest = await latestWeighIn(clerkUserId);
  if (latest) await users.updateOne({ clerkUserId }, { $set: { "profile.weightKg": latest.kg } });
}

// The weight a user onboarded with becomes their first Weigh-in, dated the day they onboarded. Does nothing once they
// have any Weigh-in, so it's safe to call after every change that may have onboarded them
export async function keepFirstWeighIn(user: {
  clerkUserId: string;
  onboardedAt: Date | null;
  profile: { weightKg?: number };
  timeZone?: string;
}) {
  const { clerkUserId, onboardedAt, profile } = user;
  const kg = profile.weightKg;
  if (!onboardedAt || kg == null) return;
  if (await weighIns.findOne({ clerkUserId })) return;
  const date = localDateOf(onboardedAt, user.timeZone ?? "UTC");
  // Another request may have kept it first
  await ignoringDuplicateKey(() =>
    weighIns.insertOne({ clerkUserId, week: mondayOfDate(date), date, kg, loggedAt: onboardedAt }),
  );
}

// One-off for users onboarded before Weigh-ins (#161): each one's stored weight becomes their first Weigh-in, in the
// week they onboarded. Safe to run repeatedly
export async function migrateWeighIns() {
  const onboarded = users.find({ onboardedAt: { $ne: null }, "profile.weightKg": { $exists: true } });
  for await (const user of onboarded) await keepFirstWeighIn(user);
}

// The Weigh-in of the week starting on this Monday and its change since the Weigh-in before, in kg; null without both
export async function weighInChange(clerkUserId: string, monday: string) {
  const [thisWeek, before] = await Promise.all([
    weighIns.findOne({ clerkUserId, week: monday }),
    weighIns.findOne({ clerkUserId, week: { $lt: monday } }, { sort: { week: -1 } }),
  ]);
  if (!thisWeek || !before) return null;
  return { kg: thisWeek.kg, changeKg: Math.round((thisWeek.kg - before.kg) * 1000) / 1000 };
}
