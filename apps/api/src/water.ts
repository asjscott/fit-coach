import { MongoServerError } from "mongodb";
import { db } from "./db";

// The shape of a water document in MongoDB: the user's water for one local date, as a total in ml
type WaterDayDoc = { clerkUserId: string; date: string; waterMl: number; updatedAt: Date };

const waterDays = db.collection<WaterDayDoc>("waterDays");

export async function ensureWaterIndexes() {
  // One total per user per local date
  await waterDays.createIndex({ clerkUserId: 1, date: 1 }, { unique: true });
}

const DUPLICATE_KEY = 11000;

// Sets the date's water to a total. When two first writes for a date race, the loser's upsert hits the unique index
// and is retried, now as a plain update
export async function setWater(clerkUserId: string, date: string, waterMl: number) {
  const write = () =>
    waterDays.updateOne({ clerkUserId, date }, { $set: { waterMl, updatedAt: new Date() } }, { upsert: true });
  try {
    await write();
  } catch (err) {
    if (!(err instanceof MongoServerError && err.code === DUPLICATE_KEY)) throw err;
    await write();
  }
}

// The user's water for a local date, 0 when none is logged
export async function findWater(clerkUserId: string, date: string): Promise<number> {
  return (await waterDays.findOne({ clerkUserId, date }))?.waterMl ?? 0;
}
