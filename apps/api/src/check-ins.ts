import { MongoServerError } from "mongodb";
import type { CheckInUpload, DatedCheckIn } from "@fit/shared";
import { db } from "./db";

// The shape of a Check-in document in MongoDB: one per user per local date. checkedInAt is a Date so it compares by time
type CheckInDoc = Omit<DatedCheckIn, "checkedInAt"> & { clerkUserId: string; checkedInAt: Date; uploadedAt: Date };

const checkIns = db.collection<CheckInDoc>("checkIns");

export async function ensureCheckInIndexes() {
  // One Check-in per user per local date
  await checkIns.createIndex({ clerkUserId: 1, date: 1 }, { unique: true });
}

const DUPLICATE_KEY = 11000;

// Stores the user's Check-in for the date, replacing one made earlier. One made later is kept, so a late upload of an
// older Check-in changes nothing. Returns the Check-in the date now has
export async function keepCheckIn(clerkUserId: string, date: string, checkIn: CheckInUpload): Promise<DatedCheckIn> {
  const checkedInAt = new Date(checkIn.checkedInAt);
  try {
    // With a later Check-in stored, the filter matches nothing and the upsert's insert hits the unique index
    await checkIns.updateOne(
      { clerkUserId, date, checkedInAt: { $lte: checkedInAt } },
      { $set: { ...checkIn, checkedInAt, uploadedAt: new Date() } },
      { upsert: true },
    );
  } catch (err) {
    if (!(err instanceof MongoServerError && err.code === DUPLICATE_KEY)) throw err;
  }
  const stored = await findCheckIn(clerkUserId, date);
  if (!stored) throw new Error("Failed to store check-in");
  return stored;
}

// The user's Check-in for a local date, or null when they didn't check in that day
export async function findCheckIn(clerkUserId: string, date: string): Promise<DatedCheckIn | null> {
  const doc = await checkIns.findOne({ clerkUserId, date });
  if (!doc) return null;
  const { sleep, energy, soreness, checkedInAt } = doc;
  return { date, sleep, energy, soreness, checkedInAt: checkedInAt.toISOString() };
}
