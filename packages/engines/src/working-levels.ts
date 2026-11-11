import {
  BAND_TAGS,
  BandLevel,
  type BandTag,
  type EquipmentTag,
  type Exercise,
  type TestedPattern,
  type WorkingLevel,
  type WorkingLevelMover,
} from "@fit/shared";
import { EXERCISES, exerciseBySlug } from "./data/exercises";
import { availableLoadsKg, isAvailable, ownedOptions, type ProfileWithLoads } from "./equipment";
import { epleyLoadKg, epleyReps } from "./e1rm";
import { STRENGTH_RATIOS } from "./strength-ratios";

// ─── Rep ranges (ADR 0007) ───

// The reps a weighted or band Working Level's target climbs within: the load (or band) goes up at the top, and a reset
// goes back to the bottom. A Ballistic Exercise's range is a fixed 8
export type RepRange = { min: number; max: number };

export const DEFAULT_REP_RANGE: RepRange = { min: 8, max: 12 };
export const BARBELL_REP_RANGE: RepRange = { min: 6, max: 10 };
export const BAND_REP_RANGE: RepRange = { min: 10, max: 15 };
export const BALLISTIC_REP_RANGE: RepRange = { min: 8, max: 8 };
// A bodyweight target climbs to this, then the Exercise moves to its harder variant
export const BODYWEIGHT_TOP_REPS = 15;
// The most reps any target climbs to, such as a weighted one at the heaviest load the profile has
export const MAX_REPS = 20;
// A carry has no range, as its reps mean nothing; it's prescribed this many, as before ranges, and only a different
// logged load moves it
export const CARRY_REPS = 8;

const isCarry = (exercise: Pick<Exercise, "patterns">) => exercise.patterns.some(({ pattern }) => pattern === "carry");

// A barbell lift is one that needs a barbell however it's done
const isBarbellLift = (exercise: Pick<Exercise, "equipmentOptions">) =>
  exercise.equipmentOptions.every((option) => option.includes("barbell"));

// The rep range of a Working Level of this unit for this Exercise: 10–15 for a band one, and for a weighted one a fixed
// 8 for a Ballistic Exercise, 6–10 for a barbell lift, else 8–12. null where there's no range: a carry, and the
// bodyweight and timed ladders (BODYWEIGHT_TOP_REPS; seconds are #132's)
export function repRange(
  exercise: Pick<Exercise, "patterns" | "equipmentOptions" | "ballistic">,
  unit: WorkingLevel["unit"],
): RepRange | null {
  if (unit === "band") return BAND_REP_RANGE;
  if (unit !== "kg" || isCarry(exercise)) return null;
  if (exercise.ballistic) return BALLISTIC_REP_RANGE;
  return isBarbellLift(exercise) ? BARBELL_REP_RANGE : DEFAULT_REP_RANGE;
}

// A weighted Working Level's starting target: the bottom of its range, or a carry's fixed reps
const startingReps = (exercise: Exercise) => repRange(exercise, "kg")?.min ?? CARRY_REPS;

// ─── Loads ───

// The heaviest of the loads at or below kg, or kg itself when none is that light (or the loads aren't known), so that
// a barbell Exercise under the empty bar stays under it (#70) and a dumbbell one rounds up only when prescribed
export function loadAtOrBelowKg(kg: number, loadsKg: readonly number[]): number {
  return loadsKg.filter((load) => load <= kg + 1e-9).at(-1) ?? kg;
}

// Every load any of the profiles offers for the Exercise, lightest first
const loadsInAny = (exercise: Exercise, profiles: readonly ProfileWithLoads[]) =>
  [...new Set(profiles.flatMap((profile) => availableLoadsKg(exercise, profile)))].sort((a, b) => a - b);

// ─── Seeding ───

// Seeded weights leave 2 reps in reserve at the target, as do bodyweight targets
const REPS_IN_RESERVE = 2;
const MIN_REPS = 3;
const CORE_REPS = 10;

const isBandTag = (tag: EquipmentTag): tag is BandTag => (BAND_TAGS as readonly EquipmentTag[]).includes(tag);

// What the Working Levels are seeded from. movedBy is the Assessment's B, or absent when the planner works a level out
// for a profile added since
type Seed = {
  referenceStrengths: Partial<Record<TestedPattern, number>>;
  bodyWeightKg: number;
  equipmentProfiles: ProfileWithLoads[];
  movedBy?: WorkingLevelMover;
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

// The reps to failure at this load for this maximum, less those in reserve, at least 3
const bodyweightReps = (maximumKg: number, loadKg: number) =>
  Math.max(MIN_REPS, Math.round(epleyReps(maximumKg, loadKg) - REPS_IN_RESERVE));

// A bodyweight target capped at the top of the ladder; a seed above it has outgrown the Exercise
const bodyweightLevel = (reps: number) => ({
  reps: Math.min(reps, BODYWEIGHT_TOP_REPS),
  outgrown: reps > BODYWEIGHT_TOP_REPS,
});

type Shape = WorkingLevel extends infer L ? (L extends WorkingLevel ? Omit<L, "movedBy" | "misses"> : never) : never;

function shapeOf(
  exercise: Exercise,
  { referenceStrengths, bodyWeightKg, equipmentProfiles: profiles }: Seed,
): Shape | null {
  const { slug } = exercise;
  const entry = STRENGTH_RATIOS[slug];
  if (!entry) return null;
  if (entry.kind === "band" || (entry.kind === "weighted" && bandsOnly(exercise, profiles))) {
    const level = lightestBand(exercise, profiles);
    return { slug, unit: "band", level, reps: BAND_REP_RANGE.min, outgrown: false };
  }
  if (entry.kind === "core-reps") return { slug, unit: "reps", reps: CORE_REPS, outgrown: false };
  // A jump's Sets are a fixed number of contacts, so it has no Working Level
  if (entry.kind === "contacts") return null;
  const reference = referenceStrengths[entry.pattern];
  if (reference === undefined) return null;
  const maximum = reference * entry.ratio;
  switch (entry.kind) {
    case "weighted": {
      const reps = startingReps(exercise);
      const kg = loadAtOrBelowKg(epleyLoadKg(maximum, reps + REPS_IN_RESERVE), loadsInAny(exercise, profiles));
      return { slug, unit: "kg", kg, reps, outgrown: false };
    }
    case "bodyweight":
      return { slug, unit: "reps", ...bodyweightLevel(bodyweightReps(maximum, bodyWeightKg * entry.share)) };
    case "timed":
      return { slug, unit: "seconds", seconds: maximum, outgrown: false };
  }
}

// A starting Working Level for every Exercise available in any of the Equipment Profiles, from the Patterns'
// Reference Strengths, with no Misses. An Exercise whose Pattern has no Reference Strength gets none
export function seedWorkingLevels(seed: Seed): WorkingLevel[] {
  const movedBy = seed.movedBy ?? null;
  return EXERCISES.filter((exercise) => seed.equipmentProfiles.some((profile) => isAvailable(exercise, profile)))
    .flatMap((exercise) => shapeOf(exercise, seed) ?? [])
    .map((shape) => ({ ...shape, movedBy, misses: 0 }));
}

// ─── The one-off migration (#131) ───

// A Working Level as stored before #131: kg for 8 reps, and nothing about its progress
export type LegacyWorkingLevel =
  | { slug: string; unit: "kg"; kg: number }
  | { slug: string; unit: "reps"; reps: number }
  | { slug: string; unit: "seconds"; seconds: number }
  | { slug: string; unit: "band"; level: BandLevel; reps: number };

const clamp = (value: number, { min, max }: RepRange) => Math.min(max, Math.max(min, value));

// A stored Working Level in the new shape: a weighted one at the heaviest load the profiles have at or below its kg,
// at the bottom of its range; band reps clamped into 10–15; bodyweight reps capped at 15, outgrown above it. movedBy
// is the Assessment's B that set it
export function migrateWorkingLevel(
  legacy: LegacyWorkingLevel,
  equipmentProfiles: readonly ProfileWithLoads[],
  movedBy: WorkingLevelMover | null,
): WorkingLevel {
  const progress = { movedBy, misses: 0, outgrown: false };
  const exercise = exerciseBySlug(legacy.slug);
  switch (legacy.unit) {
    case "kg": {
      // An Exercise the library no longer has keeps the 8 reps it was stored for
      if (!exercise) return { ...legacy, reps: CARRY_REPS, ...progress };
      const kg = loadAtOrBelowKg(legacy.kg, loadsInAny(exercise, equipmentProfiles));
      return { ...legacy, kg, reps: startingReps(exercise), ...progress };
    }
    case "band":
      return { ...legacy, reps: clamp(legacy.reps, BAND_REP_RANGE), ...progress };
    case "reps":
      return { ...legacy, ...progress, ...bodyweightLevel(legacy.reps) };
    case "seconds":
      return { ...legacy, ...progress };
  }
}
