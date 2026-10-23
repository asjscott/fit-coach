import { z } from "zod";
import { EquipmentProfile } from "./equipment";

export const Goal = z.enum(["lose_fat", "build_muscle", "recomp", "athletic"]);
export type Goal = z.infer<typeof Goal>;

export const InjuryTag = z.enum([
  "neck", "shoulder", "elbow", "wrist", "lower_back", "hip", "knee", "ankle",
]);
export type InjuryTag = z.infer<typeof InjuryTag>;

export const UserProfile = z.object({
  gender: z.enum(["male", "female"], {error: "Choose one"}),
  birthYear: z.number({error: "Enter your birth year"})
  .int("Use a whole number")
  .min(1930, "Check your birth year")
  .max(new Date().getFullYear() - 16, "You must be at least 16"),
  heightCm: z.number({error: "Enter your height"}).min(120).max(230),
  weightKg: z.number({error: "Enter your weight"}).min(35).max(250),
  goal: Goal,
  daysPerWeek: z.number().int().min(2).max(6),
  injuries: z.array(InjuryTag, {error: "Choose any that apply, or None"}),
});

export type UserProfile = z.infer<typeof UserProfile>;

// Fields that must be filled before a user counts as onboarded; injuries are optional
export const OnboardingProfile = UserProfile.omit({ injuries: true });
export type OnboardingProfile = z.infer<typeof OnboardingProfile>;

export const User = z.object({
  id: z.string(),
  profile: UserProfile.partial(),
  // Set by the server once OnboardingProfile is complete; read-only for clients
  onboardedAt: z.iso.datetime().nullable(),
  equipmentProfiles: z.array(EquipmentProfile),
});
export type User = z.infer<typeof User>;

// A user's full set of equipment profiles: unique ids and exactly one primary
export const EquipmentProfiles = z
  .array(EquipmentProfile)
  .min(1, "Add at least one equipment profile")
  .refine((profiles) => new Set(profiles.map((p) => p.id)).size === profiles.length, "Equipment profile ids must be unique")
  .refine((profiles) => profiles.filter((p) => p.isPrimary).length === 1, "Choose one primary equipment profile");

// Body for PATCH /user; profile fields are merged into the stored profile,
// equipmentProfiles replaces the stored list
export const UserUpdate = z.strictObject({
  profile: UserProfile.partial().optional(),
  equipmentProfiles: EquipmentProfiles.optional(),
});
export type UserUpdate = z.infer<typeof UserUpdate>;