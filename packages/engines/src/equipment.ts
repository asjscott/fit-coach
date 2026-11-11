import {
  BandLevel,
  DEFAULT_CABLE_STEP,
  EquipmentTag,
  fromKg,
  toKg,
  WeightUnit,
  type BuiltInEquipment,
  type EquipmentProfile,
  type Exercise,
  type InjuryTag,
} from "@fit/shared";
import { exerciseBySlug } from "./data/exercises";

// Owning one item means owning another, e.g. a power rack includes a pull-up bar
const IMPLIES: Partial<Record<EquipmentTag, EquipmentTag[]>> = {
  power_rack: ["squat_rack", "pull_up_bar"],
  adjustable_bench: ["flat_bench"],
};

// An Equipment Profile as far as the loads it offers go
export type ProfileWithLoads = Pick<EquipmentProfile, "tags" | "loads">;

export function expandTags(tags: EquipmentTag[]): Set<EquipmentTag> {
  const owned = new Set(tags);
  for (const tag of tags) IMPLIES[tag]?.forEach((extra) => owned.add(extra));
  return owned;
}

// A cable or machine with no step stored steps by DEFAULT_CABLE_STEP in the user's unit, as a new profile would
export function withLoadStepDefaults<Profile extends ProfileWithLoads>(profile: Profile, unit: WeightUnit): Profile {
  if (!profile.tags.includes("cable_machine") || profile.loads.cable_machine) return profile;
  return { ...profile, loads: { ...profile.loads, cable_machine: { stepKg: toKg(DEFAULT_CABLE_STEP[unit], unit) } } };
}

const ALL_BAND_LEVELS = { levels: BandLevel.options };

// Full gym's standard loads in each unit. Kettlebells are sized in kg either way, as most bells are
const FULL_GYM_LOADS: Record<WeightUnit, EquipmentProfile["loads"]> = {
  kg: {
    dumbbells: { kind: "adjustable", minKg: 2.5, maxKg: 50, stepKg: 2.5 },
    kettlebells: { weightsKg: [8, 12, 16, 20, 24, 28, 32] },
    barbell: { barKg: 20, platesKg: [25, 20, 15, 10, 5, 2.5, 1.25] },
    loop_bands: ALL_BAND_LEVELS,
    mini_bands: ALL_BAND_LEVELS,
    tube_bands: ALL_BAND_LEVELS,
  },
  lb: {
    dumbbells: { kind: "adjustable", minKg: toKg(5, "lb"), maxKg: toKg(100, "lb"), stepKg: toKg(5, "lb") },
    kettlebells: { weightsKg: [8, 12, 16, 20, 24, 28, 32] },
    barbell: { barKg: toKg(45, "lb"), platesKg: [45, 35, 25, 10, 5, 2.5].map((lb) => toKg(lb, "lb")) },
    loop_bands: ALL_BAND_LEVELS,
    mini_bands: ALL_BAND_LEVELS,
    tube_bands: ALL_BAND_LEVELS,
  },
};

// The equipment behind each built-in choice: Full gym has every tag and the standard loads of the user's unit
export function builtInEquipment(choice: BuiltInEquipment, unit: WeightUnit): ProfileWithLoads {
  if (choice === "bodyweight_only") return { tags: [], loads: {} };
  return withLoadStepDefaults({ tags: EquipmentTag.options, loads: FULL_GYM_LOADS[unit] }, unit);
}

// True when a profile has exactly the equipment of a built-in choice, so choosing it would change nothing
export function matchesBuiltIn(profile: Pick<EquipmentProfile, "tags">, choice: BuiltInEquipment): boolean {
  const owned = expandTags(profile.tags);
  const builtIn = expandTags(builtInEquipment(choice, "kg").tags);
  return owned.size === builtIn.size && [...owned].every((tag) => builtIn.has(tag));
}

export function ownedOptions(
  exercise: Pick<Exercise, "equipmentOptions">,
  profile: Pick<EquipmentProfile, "tags">,
): EquipmentTag[][] {
  const owned = expandTags(profile.tags);
  return exercise.equipmentOptions.filter((option) => option.every((tag) => owned.has(tag)));
}

export const isAvailable = (
  exercise: Pick<Exercise, "equipmentOptions">,
  profile: Pick<EquipmentProfile, "tags">,
): boolean => ownedOptions(exercise, profile).length > 0;

// The heaviest barbell load worth listing; plates are assumed plentiful, so only the sizes owned limit the loads
const MAX_BARBELL_KG = 300;
// Plates come in multiples of a quarter of their unit (1.25 kg, 2.5 lb), so loads are worked out in quarters to keep
// the sums exact
const QUARTERS = 4;
// Loads entered in pounds are stored as their exact kg, which sums of them can miss by a rounding error
const SAME_LOAD_KG = 1e-6;

const inQuarters = (kg: number, unit: WeightUnit) => fromKg(kg, unit) * QUARTERS;
const isWholeQuarters = (kg: number, unit: WeightUnit) =>
  Math.abs(inQuarters(kg, unit) - Math.round(inQuarters(kg, unit))) < 1e-6;

// Every load a bar plus pairs of the owned plate sizes makes, lightest first. The sums are worked out in the unit the
// bar and plates are sized in, so pound plates make exact pound loads; a mix of units is summed in kg
function barbellLoadsKg({ barKg, platesKg }: { barKg: number; platesKg: number[] }): number[] {
  const unit = WeightUnit.options.find((unit) => [barKg, ...platesKg].every((kg) => isWholeQuarters(kg, unit))) ?? "kg";
  const maxPerSide = Math.floor(inQuarters((MAX_BARBELL_KG - barKg) / 2, unit));
  const plates = platesKg.map((kg) => Math.round(inQuarters(kg, unit))).filter((q) => q > 0);
  const reachable = Array.from({ length: maxPerSide + 1 }, (_, q) => q === 0);
  for (let q = 1; q <= maxPerSide; q++) reachable[q] = plates.some((p) => p <= q && reachable[q - p]);
  const bar = fromKg(barKg, unit);
  return reachable.flatMap((ok, q) => (ok ? [toKg(bar + (2 * q) / QUARTERS, unit)] : []));
}

function dumbbellLoadsKg(dumbbells: NonNullable<EquipmentProfile["loads"]["dumbbells"]>): number[] {
  if (dumbbells.kind === "fixed") return dumbbells.weightsKg;
  const { minKg, maxKg, stepKg } = dumbbells;
  const count = Math.floor((maxKg - minKg) / stepKg + 1e-9) + 1;
  return Array.from({ length: count }, (_, i) => minKg + i * stepKg);
}

// The heaviest stack worth listing for a cable or machine
const MAX_CABLE_KG = 150;

// A cable or machine's stack, from one step up
function cableLoadsKg({ stepKg }: { stepKg: number }): number[] {
  const count = Math.floor(MAX_CABLE_KG / stepKg + 1e-9);
  return Array.from({ length: count }, (_, i) => (i + 1) * stepKg);
}

// The loads the Equipment Profile offers for an Exercise, lightest first: the dumbbells, kettlebells, bar plus plate
// pairs or cable stack it has, from every way of doing the Exercise the profile supports. For a dumbbell or kettlebell
// Exercise a load is one implement's weight. Empty when the profile doesn't say what it has
export function availableLoadsKg(exercise: Pick<Exercise, "equipmentOptions">, profile: ProfileWithLoads): number[] {
  const { dumbbells, kettlebells, barbell, cable_machine } = profile.loads;
  const loads = ownedOptions(exercise, profile)
    .flat()
    .flatMap((tag) => {
      if (tag === "dumbbells" && dumbbells) return dumbbellLoadsKg(dumbbells);
      if (tag === "kettlebells" && kettlebells) return kettlebells.weightsKg;
      if (tag === "barbell" && barbell) return barbellLoadsKg(barbell);
      if (tag === "cable_machine" && cable_machine) return cableLoadsKg(cable_machine);
      return [];
    })
    .sort((a, b) => a - b);
  return loads.filter((load, i) => i === 0 || load - loads[i - 1] > SAME_LOAD_KG);
}

// By slug, for callers that hold only a Workout Exercise; empty when either the Exercise or the profile is unknown
export function exerciseLoadsKg(slug: string, profile: ProfileWithLoads | undefined): number[] {
  const exercise = exerciseBySlug(slug);
  return exercise && profile ? availableLoadsKg(exercise, profile) : [];
}

// −1 for lighter, fewer or shorter; 1 for heavier, more or longer
export type StepDirection = 1 | -1;

// Matches the 2 kg the stepper took before it knew the equipment (#58)
export const UNKNOWN_LOADS_STEP_KG = 2;

// The next of the loads up or down from kg, which needn't be one of them; undefined past the heaviest or lightest
function nextOf(kg: number, direction: StepDirection, loadsKg: number[]): number | undefined {
  return direction === 1
    ? loadsKg.find((load) => load > kg + SAME_LOAD_KG)
    : loadsKg.filter((load) => load < kg - SAME_LOAD_KG).at(-1);
}

// Past the lightest or heaviest load there's nothing to step to, so kg stays put rather than leaving the equipment
export function stepLoadKg(kg: number, direction: StepDirection, loadsKg: number[]): number {
  if (!loadsKg.length) return Math.max(0, kg + UNKNOWN_LOADS_STEP_KG * direction);
  return nextOf(kg, direction, loadsKg) ?? kg;
}

// One Load Step up or down from kg: the next load the Equipment Profile has for the Exercise, whether dumbbells, plate
// pairs on the bar, kettlebells or the cable stack's step. Undefined past the heaviest or lightest load, or when the
// profile lists no loads for the Exercise, so there's no step to take
export const nextLoadKg = (
  exercise: Pick<Exercise, "equipmentOptions">,
  profile: ProfileWithLoads,
  kg: number,
  direction: StepDirection,
): number | undefined => nextOf(kg, direction, availableLoadsKg(exercise, profile));

export function isSafeFor(exercise: Pick<Exercise, "avoidWith">, injuries: InjuryTag[]): boolean {
  return !exercise.avoidWith.some((tag) => injuries.includes(tag));
}

// A load as the user would lift it: the nearest of the loads (the lighter on a tie), or to the nearest 0.5 kg when
// the loads aren't known
export function roundToLoadKg(kg: number, loadsKg: number[]): number {
  if (!loadsKg.length) return Math.round(kg * 2) / 2;
  return loadsKg.reduce((best, load) => (Math.abs(load - kg) < Math.abs(best - kg) ? load : best));
}

// The standard bar, for a profile that has a barbell but doesn't say what it weighs (#70)
const ASSUMED_BAR_KG = 20;

// True when every way the profile can do the Exercise needs a barbell, and kg is lighter than the bar alone
export function isUnderEmptyBar(
  kg: number,
  exercise: Pick<Exercise, "equipmentOptions">,
  profile: ProfileWithLoads,
): boolean {
  const options = ownedOptions(exercise, profile);
  const needsBar = options.length > 0 && options.every((option) => option.includes("barbell"));
  return needsBar && kg < (profile.loads.barbell?.barKg ?? ASSUMED_BAR_KG);
}
