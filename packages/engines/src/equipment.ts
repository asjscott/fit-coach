import type { EquipmentProfile, EquipmentTag, Exercise, InjuryTag } from "@fit/shared";

// Owning one item means owning another, e.g. a power rack includes a pull-up bar
const IMPLIES: Partial<Record<EquipmentTag, EquipmentTag[]>> = {
  power_rack: ["squat_rack", "pull_up_bar"],
  adjustable_bench: ["flat_bench"],
};

export function expandTags(tags: EquipmentTag[]): Set<EquipmentTag> {
  const owned = new Set(tags);
  for (const tag of tags) IMPLIES[tag]?.forEach((extra) => owned.add(extra));
  return owned;
}

export function isAvailable(
  exercise: Pick<Exercise, "equipmentOptions">,
  profile: Pick<EquipmentProfile, "tags">,
): boolean {
  const owned = expandTags(profile.tags);
  return exercise.equipmentOptions.some((option) => option.every((tag) => owned.has(tag)));
}

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
export function availableLoadsKg(
  exercise: Pick<Exercise, "equipmentOptions">,
  profile: Pick<EquipmentProfile, "tags" | "loads">,
): number[] {
  const owned = expandTags(profile.tags);
  const { dumbbells, kettlebells, barbell } = profile.loads;
  const loads = exercise.equipmentOptions
    .filter((option) => option.every((tag) => owned.has(tag)))
    .flat()
    .flatMap((tag) => {
      if (tag === "dumbbells" && dumbbells) return dumbbellLoadsKg(dumbbells);
      if (tag === "kettlebells" && kettlebells) return kettlebells.weightsKg;
      if (tag === "barbell" && barbell) return barbellLoadsKg(barbell);
      return [];
    });
  return [...new Set(loads)].sort((a, b) => a - b);
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
