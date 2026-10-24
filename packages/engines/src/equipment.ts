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

export function isSafeFor(exercise: Pick<Exercise, "avoidWith">, injuries: InjuryTag[]): boolean {
  return !exercise.avoidWith.some((tag) => injuries.includes(tag));
}
