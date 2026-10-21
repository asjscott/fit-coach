import type { WithId } from "mongodb";
import { Me, type UserProfile } from "@fit/shared";
import { db } from "./db";

// The shape of a user document in MongoDB
type UserDoc = {
  clerkUserId: string;
  createdAt: Date;
  profile: Partial<UserProfile>;
  onboardedAt: Date | null;
};

export const users = db.collection<UserDoc>("users");

export async function ensureUserIndexes() {
  await users.createIndex({ clerkUserId: 1 }, { unique: true });
}

export async function findOrCreateUser(clerkUserId: string) {
  const user = await users.findOneAndUpdate(
    { clerkUserId },
    { $setOnInsert: { clerkUserId, createdAt: new Date(), profile: {}, onboardedAt: null } },
    { upsert: true, returnDocument: "after" }
  );
  if (!user) throw new Error("Failed to create user");
  return user;
}

// Convert a database document into the shape the app expects
export function toMe(user: WithId<UserDoc>): Me {
  return Me.parse({
    id: user._id.toHexString(),
    profile: user.profile,
    onboardedAt: user.onboardedAt?.toISOString() ?? null,
  });
}