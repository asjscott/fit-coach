import { ObjectId, type WithId } from "mongodb";
import {
  BodyProfile,
  EquipmentProfile,
  type EquipmentProfileInput,
  type InjuryTag,
  OnboardingProfile,
  User,
  UserProfile,
  type UserUpdate,
} from "@fit/shared";
import type { z } from "zod";
import { db } from "./db";

// The shape of a user document in MongoDB
type UserDoc = {
  clerkUserId: string;
  createdAt: Date;
  profile: Partial<UserProfile>;
  onboardedAt: Date | null;
  equipmentProfiles: EquipmentProfile[];
  // Absent until the phone first sends it
  timeZone?: string;
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

// What logging and planning need from a user. Onboarding requires weight and gender, and they can't be removed after
export type OnboardedUser = {
  bodyProfile: BodyProfile;
  equipmentProfiles: EquipmentProfile[];
  injuries: InjuryTag[];
  timeZone: string;
} & TrainingPlanProfile;

// What a Weekly Budget is set by. Onboarding requires these too
const TrainingPlanProfile = UserProfile.pick({ goal: true, daysPerWeek: true });
type TrainingPlanProfile = z.infer<typeof TrainingPlanProfile>;

// The user once onboarded, or null before. UTC stands in until the phone first sends its timezone
export async function findOnboardedUser(clerkUserId: string): Promise<OnboardedUser | null> {
  const user = await findUser(clerkUserId);
  if (!user?.onboardedAt) return null;
  return {
    bodyProfile: BodyProfile.parse(user.profile),
    ...TrainingPlanProfile.parse(user.profile),
    equipmentProfiles: user.equipmentProfiles,
    injuries: user.profile.injuries ?? [],
    timeZone: user.timeZone ?? "UTC",
  };
}

// Idempotent: returns the existing document if this Clerk user already has one
export async function createUser(clerkUserId: string) {
  const result = await users.findOneAndUpdate(
    { clerkUserId },
    { $setOnInsert: { clerkUserId, createdAt: new Date(), profile: {}, onboardedAt: null, equipmentProfiles: [] } },
    { upsert: true, returnDocument: "after", includeResultMetadata: true },
  );
  if (!result.value) throw new Error("Failed to create user");
  return { user: result.value, created: !result.lastErrorObject?.updatedExisting };
}

// Merges profile fields into the stored profile and sets the timezone when given; null if the user doesn't exist
export async function updateUser(clerkUserId: string, { profile = {}, timeZone }: UserUpdate) {
  // $literal stops string values beginning with "$" being read as field paths
  const user = await users.findOneAndUpdate(
    { clerkUserId },
    [
      {
        $set: {
          profile: { $mergeObjects: ["$profile", { $literal: profile }] },
          ...(timeZone && { timeZone: { $literal: timeZone } }),
        },
      },
    ],
    { returnDocument: "after" },
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
    { returnDocument: "after" },
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
                  {
                    $mergeObjects: [
                      { $literal: { ...input, id } },
                      { isPrimary: { $or: [input.isPrimary, "$$p.isPrimary"] } },
                    ],
                  },
                  { $mergeObjects: ["$$p", { isPrimary: input.isPrimary ? false : "$$p.isPrimary" }] },
                ],
              },
            },
          },
        },
      },
    ],
    { returnDocument: "after" },
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
    { returnDocument: "after" },
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
    equipmentProfiles: user.equipmentProfiles ?? [],
    ...(user.timeZone && { timeZone: user.timeZone }),
  });
}
