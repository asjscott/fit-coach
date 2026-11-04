import type { EquipmentProfile, EquipmentTag, Exercise, InjuryTag } from "@fit/shared";
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
// Plates come in multiples of 0.25 kg, so loads are worked out in quarters to keep the sums exact
const QUARTERS = 4;

// Every load a bar plus pairs of the owned plate sizes makes, lightest first
function barbellLoadsKg({ barKg, platesKg }: { barKg: number; platesKg: number[] }): number[] {
  const maxPerSide = Math.floor(((MAX_BARBELL_KG - barKg) / 2) * QUARTERS);
  const plates = platesKg.map((kg) => Math.round(kg * QUARTERS)).filter((q) => q > 0);
  const reachable = Array.from({ length: maxPerSide + 1 }, (_, q) => q === 0);
  for (let q = 1; q <= maxPerSide; q++) reachable[q] = plates.some((p) => p <= q && reachable[q - p]);
  return reachable.flatMap((ok, q) => (ok ? [barKg + (2 * q) / QUARTERS] : []));
}

function dumbbellLoadsKg(dumbbells: NonNullable<EquipmentProfile["loads"]["dumbbells"]>): number[] {
  if (dumbbells.kind === "fixed") return dumbbells.weightsKg;
  const { minKg, maxKg, stepKg } = dumbbells;
  const count = Math.floor((maxKg - minKg) / stepKg + 1e-9) + 1;
  return Array.from({ length: count }, (_, i) => minKg + i * stepKg);
}

// The loads the Equipment Profile offers for an Exercise, lightest first: the dumbbells, kettlebells, or bar plus
// plate pairs it owns, from every way of doing the Exercise the profile supports. For a dumbbell or kettlebell
// Exercise a load is one implement's weight. Empty when the profile doesn't say what it has
export function availableLoadsKg(exercise: Pick<Exercise, "equipmentOptions">, profile: ProfileWithLoads): number[] {
  const { dumbbells, kettlebells, barbell } = profile.loads;
  const loads = ownedOptions(exercise, profile)
    .flat()
    .flatMap((tag) => {
      if (tag === "dumbbells" && dumbbells) return dumbbellLoadsKg(dumbbells);
      if (tag === "kettlebells" && kettlebells) return kettlebells.weightsKg;
      if (tag === "barbell" && barbell) return barbellLoadsKg(barbell);
      return [];
    });
  return [...new Set(loads)].sort((a, b) => a - b);
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

// Past the lightest or heaviest load there's nothing to step to, so kg stays put rather than leaving the equipment
export function stepLoadKg(kg: number, direction: StepDirection, loadsKg: number[]): number {
  if (!loadsKg.length) return Math.max(0, kg + UNKNOWN_LOADS_STEP_KG * direction);
  const next = direction === 1 ? loadsKg.find((load) => load > kg) : loadsKg.filter((load) => load < kg).at(-1);
  return next ?? kg;
}

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
