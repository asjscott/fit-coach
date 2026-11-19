import { db } from "./db";
import { upsertRacing } from "./duplicate-key";

// The shape of a water document in MongoDB: the user's water for one local date, as a total in ml
type WaterDayDoc = { clerkUserId: string; date: string; waterMl: number; updatedAt: Date };

const waterDays = db.collection<WaterDayDoc>("waterDays");

export async function ensureWaterIndexes() {
  // One total per user per local date
  await waterDays.createIndex({ clerkUserId: 1, date: 1 }, { unique: true });
}

// Sets the date's water to a total
export async function setWater(clerkUserId: string, date: string, waterMl: number) {
  await upsertRacing(() =>
    waterDays.updateOne({ clerkUserId, date }, { $set: { waterMl, updatedAt: new Date() } }, { upsert: true }),
  );
}

// The user's water for a local date, 0 when none is logged
export async function findWater(clerkUserId: string, date: string): Promise<number> {
  return (await waterDays.findOne({ clerkUserId, date }))?.waterMl ?? 0;
}
