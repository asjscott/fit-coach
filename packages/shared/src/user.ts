import { z } from "zod";
import { LocalDate } from "./check-in";
import { EquipmentProfile } from "./equipment";
import { DEFAULT_WEIGHT_UNIT, fromKg, inUnitToStep, toKg, WeightUnit } from "./units";

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

// How much the user moves in daily life, strength Workouts included but never Activities (GLOSSARY.md)
export const ActivityLevel = z.enum(["sedentary", "lightly_active", "active", "very_active"]);
export type ActivityLevel = z.infer<typeof ActivityLevel>;

// What the Daily Targets count a user as until they choose an Activity Level
export const DEFAULT_ACTIVITY_LEVEL: ActivityLevel = "lightly_active";

// A day of the week, Monday first as the weeks run
export const Weekday = z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
export type Weekday = z.infer<typeof Weekday>;

// The day Today asks for the week's Weigh-in, for a user who never chose one (GLOSSARY.md)
export const DEFAULT_WEIGH_IN_DAY: Weekday = "monday";

// What the user eats, which only decides the Food Ideas the Coach offers (GLOSSARY.md "Diet")
export const DietKind = z.enum(["any", "pescatarian", "vegetarian", "vegan"]);
export type DietKind = z.infer<typeof DietKind>;

// The foods a user can avoid, and that a Food Idea can contain
export const AvoidedFood = z.enum(["dairy", "gluten", "nuts", "pork"]);
export type AvoidedFood = z.infer<typeof AvoidedFood>;

export const Diet = z.object({ kind: DietKind, avoid: z.array(AvoidedFood) });
export type Diet = z.infer<typeof Diet>;

// The Diet of a user who never chose one: anything, avoiding nothing
const DEFAULT_DIET: Diet = { kind: "any", avoid: [] };

// The user's Diet, or DEFAULT_DIET when they never chose one (or there's no profile yet)
export const dietOf = (profile: { diet?: Diet } | undefined): Diet => profile?.diet ?? DEFAULT_DIET;

// The user's own daily fibre target in grams, in place of the rule that follows their calories
export const FibreTarget = z
  .number({ error: "Enter grams of fibre" })
  .int("Use a whole number")
  .min(10, "Must be 10 g or more")
  .max(150, "Must be 150 g or less");

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
  // Onboarding asks for it. A user onboarded before it existed has none, and Today asks them once
  activityLevel: ActivityLevel.optional(),
  // Absent when the Daily Targets follow the rule; PATCHing null clears it
  fibreTargetG: FibreTarget.optional(),
  // Absent until the user chooses one, which means DEFAULT_WEIGH_IN_DAY
  weighInDay: Weekday.optional(),
  // Absent until the user chooses one, which means DEFAULT_DIET (dietOf)
  diet: Diet.optional(),
});

export type UserProfile = z.infer<typeof UserProfile>;

// Body weight follows "Weights in" like every load, and is stored in kg (#148). It shows to a tenth, so a weight
// entered in either unit reads back as entered: 180 lb is stored as its exact kg and shows as 180
export const bodyWeightInUnit = (kg: number, unit: WeightUnit) => inUnitToStep(kg, unit, 0.1);

// A body weight answered in the user's unit as kg to store: its exact kg, or the stored kg when the answer is the
// one shown for it, so editing the profile without touching the weight never nudges it (80 kg shows as 176.4 lb)
export function bodyWeightKg(answer: number, unit: WeightUnit, storedKg?: number) {
  if (storedKg != null && answer === bodyWeightInUnit(storedKg, unit)) return storedKg;
  return toKg(answer, unit);
}

// The profile's body weight range, in kg
const { minValue: MIN_BODY_WEIGHT_KG, maxValue: MAX_BODY_WEIGHT_KG } = UserProfile.shape.weightKg;

// A body weight answered in the user's unit: whole numbers inside the profile's kg range, so every answer it takes
// saves (78–551 lb, 35–250 kg)
export function bodyWeightAnswer(unit: WeightUnit) {
  const min = Math.ceil(fromKg(MIN_BODY_WEIGHT_KG ?? 0, unit));
  const max = Math.floor(fromKg(MAX_BODY_WEIGHT_KG ?? Infinity, unit));
  return z
    .number({ error: "Enter your weight" })
    .min(min, `Must be ${min} ${unit} or more`)
    .max(max, `Must be ${max} ${unit} or less`);
}

// The user's body weight for one week, Monday to Sunday, in their timezone (GLOSSARY.md): the local date it was taken
// and its exact kg
export const WeighIn = z.object({ date: LocalDate, kg: z.number() });
export type WeighIn = z.infer<typeof WeighIn>;

// Body for PUT /weigh-ins/:date: the weight as entered, in the unit it was entered in, so the server stores its exact kg
export const WeighInUpload = z.object({ weight: z.number(), unit: WeightUnit }).superRefine(({ weight, unit }, ctx) => {
  const answer = bodyWeightAnswer(unit).safeParse(weight);
  if (!answer.success) ctx.addIssue({ code: "custom", message: answer.error.issues[0].message, path: ["weight"] });
});
export type WeighInUpload = z.infer<typeof WeighInUpload>;

// What the Assessment's strength estimates scale with: the typical strength for this body weight and gender
export const BodyProfile = UserProfile.pick({ weightKg: true, gender: true });
export type BodyProfile = z.infer<typeof BodyProfile>;

// Fields that must be filled before a user counts as onboarded; injuries, the jumps switch, the Activity Level and the
// fibre target are optional
export const OnboardingProfile = UserProfile.omit({ injuries: true, includeJumps: true, fibreTargetG: true });
export type OnboardingProfile = z.infer<typeof OnboardingProfile>;

export const User = z.object({
  id: z.string(),
  profile: UserProfile.partial(),
  // Set by the server once OnboardingProfile is complete; read-only for clients
  onboardedAt: z.iso.datetime().nullable(),
  equipmentProfiles: z.array(EquipmentProfile),
  // The phone's IANA timezone, so the server's weeks match Today's (ADR 0003); absent until the phone first sends it
  timeZone: z.string().optional(),
  // The unit every load shows in; a user who has never chosen gets the default
  unit: WeightUnit.default(DEFAULT_WEIGHT_UNIT),
  // The latest Weigh-in, whose kg the server keeps profile.weightKg at; null before onboarding
  latestWeighIn: WeighIn.nullable().default(null),
  // Whether the week holding today, in the user's timezone, has a Weigh-in, as of when the user was read
  weighedInThisWeek: z.boolean().default(false),
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

// Body for PATCH /user; profile fields are merged into the stored profile, and a fibre target of null clears it
export const UserUpdate = z.strictObject({
  profile: UserProfile.partial().extend({ fibreTargetG: FibreTarget.nullable().optional() }).optional(),
  timeZone: z.string().refine(isTimeZone, { error: "Unknown timezone" }).optional(),
  unit: WeightUnit.optional(),
});
export type UserUpdate = z.infer<typeof UserUpdate>;
