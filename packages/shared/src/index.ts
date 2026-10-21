import { z } from "zod";

export const HealthResponse = z.object({
  status: z.literal("ok"),
  db: z.enum(["up", "down"]),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

export const Goal = z.enum(["lose_fat", "build_muscle", "recomp", "athletic"]);

export const InjuryTag = z.enum([
  "neck", "shoulder", "elbow", "wrist", "lower_back", "hip", "knee", "ankle",
]);

export const UserProfile = z.object({
  sex: z.enum(["male", "female"]),
  birthYear: z.number().int().min(1930).max(new Date().getFullYear() - 16),
  heightCm: z.number().min(120).max(230),
  weightKg: z.number().min(35).max(250),
  goal: Goal,
  daysPerWeek: z.number().int().min(2).max(6),
  injuries: z.array(InjuryTag),
});

export type UserProfile = z.infer<typeof UserProfile>;

export const Me = z.object({
  id: z.string(),
  profile: UserProfile.partial(),
  onboardedAt: z.iso.datetime().nullable(),
});

export type Me = z.infer<typeof Me>;