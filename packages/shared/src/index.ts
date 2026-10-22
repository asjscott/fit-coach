import { z } from "zod";

export const HealthResponse = z.object({
  status: z.literal("ok"),
  db: z.enum(["up", "down"]),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

export const Goal = z.enum(["lose_fat", "build_muscle", "recomp", "athletic"]);
export type Goal = z.infer<typeof Goal>;

export const InjuryTag = z.enum([
  "neck", "shoulder", "elbow", "wrist", "lower_back", "hip", "knee", "ankle",
]);
export type InjuryTag = z.infer<typeof InjuryTag>;

export const UserProfile = z.object({
  sex: z.enum(["male", "female"], {error: "Choose one"}),
  birthYear: z.number({error: "Enter your birth year"})
  .int("Use a whole number")
  .min(1930, "Check your birth year")
  .max(new Date().getFullYear() - 16, "You must be at least 16"),
  heightCm: z.number({error: "Enter your height"}).min(120).max(230),
  weightKg: z.number({error: "Enter your weight"}).min(35).max(250),
  goal: Goal,
  daysPerWeek: z.number().int().min(2).max(6),
  injuries: z.array(InjuryTag),
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
});
export type User = z.infer<typeof User>;

// Body for PATCH /user; profile fields are merged into the stored profile
export const UserUpdate = z.strictObject({
  profile: UserProfile.partial(),
});
export type UserUpdate = z.infer<typeof UserUpdate>;

export const ErrorResponse = z.object({
  error: z.string(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;