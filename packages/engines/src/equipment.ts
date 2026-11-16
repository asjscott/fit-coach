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

// The free weights a profile can list. A gym listing none of them has Full gym's
const FREE_WEIGHT_LOADS = ["dumbbells", "kettlebells", "barbell"] as const;

// The loads a profile has where it lists none of its own, in the user's unit. A profile with all of Full gym's
// equipment and no free weights listed, such as the gym a user onboards with, has Full gym's loads. A cable or machine
// with no step stored steps by DEFAULT_CABLE_STEP, as a new profile would
export function withDefaultLoads<Profile extends ProfileWithLoads>(profile: Profile, unit: WeightUnit): Profile {
  const isUnlistedGym = matchesBuiltIn(profile, "full_gym") && FREE_WEIGHT_LOADS.every((tag) => !profile.loads[tag]);
  const loads = { ...(isUnlistedGym && FULL_GYM_LOADS[unit]), ...profile.loads };
  if (profile.tags.includes("cable_machine") && !loads.cable_machine) {
    loads.cable_machine = { stepKg: toKg(DEFAULT_CABLE_STEP[unit], unit) };
  }
  return { ...profile, loads };
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
  return withDefaultLoads({ tags: BUILT_IN_TAGS[choice], loads: {} }, unit);
}

const BUILT_IN_TAGS: Record<BuiltInEquipment, EquipmentTag[]> = { full_gym: EquipmentTag.options, bodyweight_only: [] };

// True when a profile has exactly the equipment of a built-in choice, so choosing it would change nothing
export function matchesBuiltIn(profile: Pick<EquipmentProfile, "tags">, choice: BuiltInEquipment): boolean {
  const owned = expandTags(profile.tags);
  const builtIn = expandTags(BUILT_IN_TAGS[choice]);
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
// How far apart two loads can be and still be the same load, in kg or the user's unit alike: loads entered in pounds
// are stored as their exact kg, which sums of them can miss by a rounding error
const SAME_LOAD_TOLERANCE = 1e-6;

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

// The loads of each kind of equipment, each lightest first and all in one unit, in the order of the Exercise's ways of
// doing it, so the first is the kind the Exercise prefers
export type LoadsByEquipment = readonly (readonly number[])[];

// The loads of each kind of equipment the Equipment Profile has for an Exercise, in kg: the dumbbells, kettlebells,
// bar plus plate pairs or cable stack it has. For a dumbbell or kettlebell Exercise a load is one implement's weight.
// A kind the profile lists no loads for is left out
export function loadsByEquipmentKg(
  exercise: Pick<Exercise, "equipmentOptions">,
  profile: ProfileWithLoads,
): number[][] {
  const { dumbbells, kettlebells, barbell, cable_machine } = profile.loads;
  const tags = [...new Set(ownedOptions(exercise, profile).flat())];
  return tags
    .map((tag) => {
      if (tag === "dumbbells" && dumbbells) return dumbbellLoadsKg(dumbbells);
      if (tag === "kettlebells" && kettlebells) return kettlebells.weightsKg;
      if (tag === "barbell" && barbell) return barbellLoadsKg(barbell);
      if (tag === "cable_machine" && cable_machine) return cableLoadsKg(cable_machine);
      return [];
    })
    .filter((loads) => loads.length > 0)
    .map(lightestFirst);
}

// Sorted, with loads a rounding error apart kept once
function lightestFirst(loadsKg: readonly number[]): number[] {
  const loads = [...loadsKg].sort((a, b) => a - b);
  return loads.filter((load, i) => i === 0 || load - loads[i - 1]! > SAME_LOAD_TOLERANCE);
}

// The loads the Equipment Profile offers for an Exercise, lightest first, from every kind of equipment it can be done
// with. Empty when the profile doesn't say what it has
export const availableLoadsKg = (exercise: Pick<Exercise, "equipmentOptions">, profile: ProfileWithLoads): number[] =>
  lightestFirst(loadsByEquipmentKg(exercise, profile).flat());

// An Exercise's loads by slug, for callers that hold only a Workout Exercise; empty when either the Exercise or the
// profile is unknown
const bySlug =
  <Loads>(loadsOf: (exercise: Exercise, profile: ProfileWithLoads) => Loads[]) =>
  (slug: string, profile: ProfileWithLoads | undefined): Loads[] => {
    const exercise = exerciseBySlug(slug);
    return exercise && profile ? loadsOf(exercise, profile) : [];
  };

// availableLoadsKg by slug
export const exerciseLoadsKg = bySlug(availableLoadsKg);

// loadsByEquipmentKg by slug
export const exerciseLoadsByEquipmentKg = bySlug(loadsByEquipmentKg);

// −1 for lighter, fewer or shorter; 1 for heavier, more or longer
export type StepDirection = 1 | -1;

// Matches the 2 kg the stepper took before it knew the equipment (#58)
export const UNKNOWN_LOADS_STEP_KG = 2;

// The loads a Load Step from `load` moves through, so it stays on one kind of equipment (#149): those of the
// Exercise's first kind that has the load, or of its first kind when none does
function loadsSteppedFrom(load: number, loadsByEquipment: LoadsByEquipment): readonly number[] {
  const on = loadsByEquipment.find((loads) => loads.some((each) => Math.abs(each - load) <= SAME_LOAD_TOLERANCE));
  return on ?? loadsByEquipment[0] ?? [];
}

// One Load Step up or down from `load`, which needn't be one of the loads: the next load on the kind of equipment it's
// on (loadsSteppedFrom). Loads in any one unit. Undefined past the heaviest or lightest load, or with no loads
export function stepThroughLoads(
  load: number,
  direction: StepDirection,
  loadsByEquipment: LoadsByEquipment,
): number | undefined {
  const loads = loadsSteppedFrom(load, loadsByEquipment);
  return direction === 1
    ? loads.find((each) => each > load + SAME_LOAD_TOLERANCE)
    : loads.filter((each) => each < load - SAME_LOAD_TOLERANCE).at(-1);
}

// A stepper's next load: stepThroughLoads, staying put past the lightest or heaviest load rather than leaving the
// equipment, and moving by unknownStep, never below 0, when the loads aren't known
export function stepperLoad(
  load: number,
  direction: StepDirection,
  loadsByEquipment: LoadsByEquipment,
  unknownStep: number,
): number {
  if (!loadsByEquipment.some((loads) => loads.length)) return Math.max(0, load + unknownStep * direction);
  return stepThroughLoads(load, direction, loadsByEquipment) ?? load;
}

// One Load Step up or down from kg through the loads the Equipment Profile has for the Exercise (stepThroughLoads):
// dumbbells, plate pairs on the bar, kettlebells or the cable stack's step. Undefined past the heaviest or lightest
// load, or when the profile lists no loads for the Exercise, so there's no step to take
export const nextLoadKg = (
  exercise: Pick<Exercise, "equipmentOptions">,
  profile: ProfileWithLoads,
  kg: number,
  direction: StepDirection,
): number | undefined => stepThroughLoads(kg, direction, loadsByEquipmentKg(exercise, profile));

export function isSafeFor(exercise: Pick<Exercise, "avoidWith">, injuries: InjuryTag[]): boolean {
  return !exercise.avoidWith.some((tag) => injuries.includes(tag));
}

// A load as the user would lift it: the nearest of the loads (the lighter on a tie), or to the nearest 0.5 kg when
// the loads aren't known
// The heaviest of the loads at or below kg, or kg itself when none is that light (or the loads aren't known), so that
// a barbell Exercise under the empty bar stays under it (#70) and a dumbbell one rounds up only when prescribed. Loads
// sorted lightest first, as availableLoadsKg gives them
export function loadAtOrBelowKg(kg: number, loadsKg: readonly number[]): number {
  return loadsKg.filter((load) => load <= kg + SAME_LOAD_TOLERANCE).at(-1) ?? kg;
}

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
