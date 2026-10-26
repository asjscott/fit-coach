import type { BandLevel, EquipmentProfile, EquipmentTag, Exercise, TestedPattern, WorkingLevel } from "@fit/shared";
import { EXERCISES } from "./data/exercises";
import { expandTags, isAvailable } from "./equipment";
import { STRENGTH_RATIOS } from "./strength-ratios";

// A Working Level in kg is for 8 reps with 2 in reserve, so it's the load whose e1RM at 10 reps is the maximum
const WORKING_LEVEL_E1RM_REPS = 10;
// A bodyweight Working Level leaves the same 2 reps in reserve
const REPS_IN_RESERVE = 2;
const MIN_REPS = 3;
const MAX_REPS = 20;
const CORE_REPS = 10;
const BAND_REPS = 12;

const BAND_TAGS = ["loop_bands", "mini_bands", "tube_bands"] as const satisfies EquipmentTag[];
type BandTag = (typeof BAND_TAGS)[number];
const isBandTag = (tag: EquipmentTag): tag is BandTag => (BAND_TAGS as readonly EquipmentTag[]).includes(tag);
const BAND_LEVELS: BandLevel[] = ["light", "medium", "heavy", "extra_heavy"];

type Profile = Pick<EquipmentProfile, "tags" | "loads">;

// The ways of doing the Exercise the Equipment Profiles support
const ownedOptions = (exercise: Exercise, profiles: Profile[]) =>
  profiles.flatMap((profile) => {
    const owned = expandTags(profile.tags);
    return exercise.equipmentOptions
      .filter((option) => option.every((tag) => owned.has(tag)))
      .map((option) => ({ option, profile }));
  });

// The lightest band the user has for the Exercise; light when the profiles don't say (or it's done on a cable)
function lightestBand(exercise: Exercise, profiles: Profile[]): BandLevel {
  const levels = new Set(
    ownedOptions(exercise, profiles).flatMap(({ option, profile }) =>
      option.filter(isBandTag).flatMap((tag) => profile.loads[tag]?.levels ?? []),
    ),
  );
  return BAND_LEVELS.find((level) => levels.has(level)) ?? "light";
}

// A weighted Exercise the user can only do with bands, like a lateral raise with no dumbbells
const bandsOnly = (exercise: Exercise, profiles: Profile[]) =>
  ownedOptions(exercise, profiles).every(({ option }) => option.some(isBandTag));

// Inverts Epley: the reps to failure at this load for this maximum, less those in reserve, capped
function repTarget(maximumKg: number, loadKg: number) {
  const repsToFailure = 30 * (maximumKg / loadKg - 1);
  return Math.min(MAX_REPS, Math.max(MIN_REPS, Math.round(repsToFailure - REPS_IN_RESERVE)));
}

function workingLevelOf(
  exercise: Exercise,
  referenceStrengths: Partial<Record<TestedPattern, number>>,
  bodyWeightKg: number,
  profiles: Profile[],
): WorkingLevel | null {
  const { slug } = exercise;
  const entry = STRENGTH_RATIOS[slug];
  if (!entry) return null;
  if (entry.kind === "band" || (entry.kind === "weighted" && bandsOnly(exercise, profiles))) {
    return { slug, unit: "band", level: lightestBand(exercise, profiles), reps: BAND_REPS };
  }
  if (entry.kind === "core-reps") return { slug, unit: "reps", reps: CORE_REPS };
  // Still to come: a Pattern with no test estimated from the others (#38)
  const reference = referenceStrengths[entry.pattern];
  if (reference === undefined) return null;
  const maximum = reference * entry.ratio;
  switch (entry.kind) {
    case "weighted":
      return { slug, unit: "kg", kg: maximum / (1 + WORKING_LEVEL_E1RM_REPS / 30) };
    case "bodyweight":
      return { slug, unit: "reps", reps: repTarget(maximum, bodyWeightKg * entry.share) };
    case "timed":
      return { slug, unit: "seconds", seconds: maximum };
  }
}

// A starting Working Level for every Exercise available in any of the Equipment Profiles, from the Patterns'
// Reference Strengths. An Exercise whose Pattern has no Reference Strength gets none
export function seedWorkingLevels(
  referenceStrengths: Partial<Record<TestedPattern, number>>,
  bodyWeightKg: number,
  equipmentProfiles: Profile[],
): WorkingLevel[] {
  return EXERCISES.filter((exercise) => equipmentProfiles.some((profile) => isAvailable(exercise, profile))).flatMap(
    (exercise) => workingLevelOf(exercise, referenceStrengths, bodyWeightKg, equipmentProfiles) ?? [],
  );
}
