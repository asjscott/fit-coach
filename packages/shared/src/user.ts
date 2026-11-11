import { z } from "zod";
import { EquipmentProfile } from "./equipment";

export const Goal = z.enum(["lose_fat", "build_muscle", "recomp", "athletic"]);
export type Goal = z.infer<typeof Goal>;

export const InjuryTag = z.enum(["neck", "shoulder", "elbow", "wrist", "lower_back", "hip", "knee", "ankle"]);
export type InjuryTag = z.infer<typeof InjuryTag>;

export const WorkoutLength = z.enum(["short", "standard", "long"]);
export type WorkoutLength = z.infer<typeof WorkoutLength>;

// The Lengths for one Workout: the usual ones and Quick, which is never stored on the user. Shortest first
export const DayLength = z.enum(["quick", ...WorkoutLength.options]);
export type DayLength = z.infer<typeof DayLength>;

export const WORKOUT_LENGTH_MINUTES: Record<DayLength, number> = { quick: 20, short: 30, standard: 45, long: 60 };

export const UserProfile = z.object({
  gender: z.enum(["male", "female"], { error: "Choose one" }),
  birthYear: z
    .number({ error: "Enter your birth year" })
    .int("Use a whole number")
    .min(1930, "Check your birth year")
    .max(new Date().getFullYear() - 16, "You must be at least 16"),
  heightCm: z.number({ error: "Enter your height" }).min(120).max(230),
  weightKg: z.number({ error: "Enter your weight" }).min(35).max(250),
  goal: Goal,
  daysPerWeek: z.number().int().min(2).max(6),
  workoutLength: WorkoutLength,
  injuries: z.array(InjuryTag, { error: "Choose any that apply, or None" }),
  // The one-time "Include jumps" switch, off by default: jumps are for the athletic Goal only (#105)
  includeJumps: z.boolean().optional(),
});

export type UserProfile = z.infer<typeof UserProfile>;

// What the Assessment's strength estimates scale with: the typical strength for this body weight and gender
export const BodyProfile = UserProfile.pick({ weightKg: true, gender: true });
export type BodyProfile = z.infer<typeof BodyProfile>;

// Fields that must be filled before a user counts as onboarded; injuries and the jumps switch are optional
export const OnboardingProfile = UserProfile.omit({ injuries: true, includeJumps: true });
export type OnboardingProfile = z.infer<typeof OnboardingProfile>;

export const User = z.object({
  id: z.string(),
  profile: UserProfile.partial(),
  // Set by the server once OnboardingProfile is complete; read-only for clients
  onboardedAt: z.iso.datetime().nullable(),
  equipmentProfiles: z.array(EquipmentProfile),
  // The phone's IANA timezone, so the server's weeks match Today's (ADR 0003); absent until the phone first sends it
  timeZone: z.string().optional(),
});
export type User = z.infer<typeof User>;

function isTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

// Body for PATCH /user; profile fields are merged into the stored profile
export const UserUpdate = z.strictObject({
  profile: UserProfile.partial().optional(),
  timeZone: z.string().refine(isTimeZone, { error: "Unknown timezone" }).optional(),
});
export type UserUpdate = z.infer<typeof UserUpdate>;
