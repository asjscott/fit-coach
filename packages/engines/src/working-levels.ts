import {
  BAND_TAGS,
  BandLevel,
  type BandTag,
  type EquipmentTag,
  type Exercise,
  type TestedPattern,
  type WorkingLevel,
} from "@fit/shared";
import { EXERCISES } from "./data/exercises";
import { isAvailable, ownedOptions, type ProfileWithLoads } from "./equipment";
import { epleyLoadKg, epleyReps } from "./e1rm";
import { STRENGTH_RATIOS } from "./strength-ratios";

// A Working Level in kg is for 8 reps with 2 in reserve, so it's the load whose e1RM at 10 reps is the maximum. A
// bodyweight Working Level leaves the same 2 in reserve
export const WORKING_LEVEL_REPS = 8;
const REPS_IN_RESERVE = 2;
const WORKING_LEVEL_E1RM_REPS = WORKING_LEVEL_REPS + REPS_IN_RESERVE;
const MIN_REPS = 3;
export const MAX_REPS = 20;
const CORE_REPS = 10;
const BAND_REPS = 12;

const isBandTag = (tag: EquipmentTag): tag is BandTag => (BAND_TAGS as readonly EquipmentTag[]).includes(tag);

// What the Working Levels are seeded from
type Seed = {
  referenceStrengths: Partial<Record<TestedPattern, number>>;
  bodyWeightKg: number;
  equipmentProfiles: ProfileWithLoads[];
};

// The ways of doing the Exercise any of the Equipment Profiles supports, each with its profile
const optionsOwnedByAny = (exercise: Exercise, profiles: ProfileWithLoads[]) =>
  profiles.flatMap((profile) => ownedOptions(exercise, profile).map((option) => ({ option, profile })));

// The lightest band the user has for the Exercise; light when the profiles don't say (or it's done on a cable)
function lightestBand(exercise: Exercise, profiles: ProfileWithLoads[]): BandLevel {
  const levels = new Set(
    optionsOwnedByAny(exercise, profiles).flatMap(({ option, profile }) =>
      option.filter(isBandTag).flatMap((tag) => profile.loads[tag]?.levels ?? []),
    ),
  );
  // The schema lists band levels lightest first
  return BandLevel.options.find((level) => levels.has(level)) ?? "light";
}

// A weighted Exercise the user can only do with bands, like a lateral raise with no dumbbells
const bandsOnly = (exercise: Exercise, profiles: ProfileWithLoads[]) =>
  optionsOwnedByAny(exercise, profiles).every(({ option }) => option.some(isBandTag));

// The reps to failure at this load for this maximum, less those in reserve, capped
function repTarget(maximumKg: number, loadKg: number) {
  return Math.min(MAX_REPS, Math.max(MIN_REPS, Math.round(epleyReps(maximumKg, loadKg) - REPS_IN_RESERVE)));
}

function workingLevelOf(
  exercise: Exercise,
  { referenceStrengths, bodyWeightKg, equipmentProfiles: profiles }: Seed,
): WorkingLevel | null {
  const { slug } = exercise;
  const entry = STRENGTH_RATIOS[slug];
  if (!entry) return null;
  if (entry.kind === "band" || (entry.kind === "weighted" && bandsOnly(exercise, profiles))) {
    return { slug, unit: "band", level: lightestBand(exercise, profiles), reps: BAND_REPS };
  }
  if (entry.kind === "core-reps") return { slug, unit: "reps", reps: CORE_REPS };
  // A jump's Sets are a fixed number of contacts, so it has no Working Level
  if (entry.kind === "contacts") return null;
  const reference = referenceStrengths[entry.pattern];
  if (reference === undefined) return null;
  const maximum = reference * entry.ratio;
  switch (entry.kind) {
    case "weighted":
      return { slug, unit: "kg", kg: epleyLoadKg(maximum, WORKING_LEVEL_E1RM_REPS) };
    case "bodyweight":
      return { slug, unit: "reps", reps: repTarget(maximum, bodyWeightKg * entry.share) };
    case "timed":
      return { slug, unit: "seconds", seconds: maximum };
  }
}

// A starting Working Level for every Exercise available in any of the Equipment Profiles, from the Patterns'
// Reference Strengths. An Exercise whose Pattern has no Reference Strength gets none
export function seedWorkingLevels(seed: Seed): WorkingLevel[] {
  return EXERCISES.filter((exercise) =>
    seed.equipmentProfiles.some((profile) => isAvailable(exercise, profile)),
  ).flatMap((exercise) => workingLevelOf(exercise, seed) ?? []);
}
