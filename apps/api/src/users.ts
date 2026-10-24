import { ObjectId, type WithId } from "mongodb";
import { EquipmentProfile, type EquipmentProfileInput, OnboardingProfile, User, type UserProfile, type UserUpdate } from "@fit/shared";
import { db } from "./db";

// The shape of a user document in MongoDB
type UserDoc = {
  clerkUserId: string;
  createdAt: Date;
  profile: Partial<UserProfile>;
  onboardedAt: Date | null;
  equipmentProfiles: EquipmentProfile[]
};

export const users = db.collection<UserDoc>("users");

export async function ensureUserIndexes() {
  await users.createIndex({ clerkUserId: 1 }, { unique: true });
}

// profile.sex was renamed to profile.gender; safe to run repeatedly
export async function migrateUsers() {
  const legacy = db.collection("users");
  await legacy.updateMany({ "profile.sex": { $exists: true } }, { $rename: { "profile.sex": "profile.gender" } });
}

export function findUser(clerkUserId: string) {
  return users.findOne({ clerkUserId });
}

// Idempotent: returns the existing document if this Clerk user already has one
export async function createUser(clerkUserId: string) {
  const result = await users.findOneAndUpdate(
    { clerkUserId },
    { $setOnInsert: { clerkUserId, createdAt: new Date(), profile: {}, onboardedAt: null, equipmentProfiles: [] } },
    { upsert: true, returnDocument: "after", includeResultMetadata: true }
  );
  if (!result.value) throw new Error("Failed to create user");
  return { user: result.value, created: !result.lastErrorObject?.updatedExisting };
}

// Merges profile fields into the stored profile; null if the user doesn't exist
export async function updateUser(clerkUserId: string, { profile }: UserUpdate) {
  // $literal stops string values beginning with "$" being read as field paths
  const user = await users.findOneAndUpdate(
    { clerkUserId },
    [{ $set: { profile: { $mergeObjects: ["$profile", { $literal: profile }] } } }],
    { returnDocument: "after" }
  );
  return user && markOnboardedIfComplete(user);
}

// Users created before equipment profiles existed have no array
const storedProfiles = { $ifNull: ["$equipmentProfiles", []] };

// Adds a profile with a server-generated id; null if the user doesn't exist.
// The first profile is always primary, and a new primary demotes the others
export async function createEquipmentProfile(clerkUserId: string, input: EquipmentProfileInput) {
  const isPrimary = { $or: [input.isPrimary, { $eq: [{ $size: storedProfiles }, 0] }] };
  const profile = { ...input, id: new ObjectId().toHexString() };

  const user = await users.findOneAndUpdate(
    { clerkUserId },
    [
      {
        $set: {
          equipmentProfiles: {
            $concatArrays: [
              {
                $map: {
                  input: storedProfiles,
                  as: "p",
                  in: { $mergeObjects: ["$$p", { isPrimary: input.isPrimary ? false : "$$p.isPrimary" }] },
                },
              },
              [{ $mergeObjects: [{ $literal: profile }, { isPrimary }] }],
            ],
          },
        },
      },
    ],
    { returnDocument: "after" }
  );
  return user && markOnboardedIfComplete(user);
}

// Replaces the profile with this id; null if the user or profile doesn't exist.
// Making it primary demotes the others; the primary can't be unset directly,
// only by making another profile primary
export async function updateEquipmentProfile(clerkUserId: string, id: string, input: EquipmentProfileInput) {
  const user = await users.findOneAndUpdate(
    { clerkUserId, "equipmentProfiles.id": id },
    [
      {
        $set: {
          equipmentProfiles: {
            $map: {
              input: "$equipmentProfiles",
              as: "p",
              in: {
                $cond: [
                  { $eq: ["$$p.id", { $literal: id }] },
                  { $mergeObjects: [{ $literal: { ...input, id } }, { isPrimary: { $or: [input.isPrimary, "$$p.isPrimary"] } }] },
                  { $mergeObjects: ["$$p", { isPrimary: input.isPrimary ? false : "$$p.isPrimary" }] },
                ],
              },
            },
          },
        },
      },
    ],
    { returnDocument: "after" }
  );
  return user && markOnboardedIfComplete(user);
}

// Stamp onboardedAt the first time the required profile fields are all valid
// and the user has at least one equipment profile
async function markOnboardedIfComplete(user: WithId<UserDoc>) {
  if (user.onboardedAt) return user;
  if (!OnboardingProfile.safeParse(user.profile).success || !user.equipmentProfiles?.length) return user;
  const updated = await users.findOneAndUpdate(
    { _id: user._id, onboardedAt: null },
    { $set: { onboardedAt: new Date() } },
    { returnDocument: "after" }
  );
  // null means another request stamped it first
  return updated ?? (await users.findOne({ _id: user._id })) ?? user;
}

// Convert a database document into the shape the app expects
export function toUser(user: WithId<UserDoc>): User {
  return User.parse({
    id: user._id.toHexString(),
    profile: user.profile,
    onboardedAt: user.onboardedAt?.toISOString() ?? null,
    equipmentProfiles: user.equipmentProfiles ?? []
  });
}
