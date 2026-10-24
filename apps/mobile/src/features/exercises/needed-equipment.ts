import { EQUIPMENT_LABELS, type EquipmentTag, type Exercise } from "@fit/shared";
import { expandTags } from "@fit/engines";

// What's missing for each of the exercise's equipment options, e.g. "Pull-up bar or Gymnastic rings".
// Uses the same IMPLIES expansion as isAvailable, so a power rack covers a squat rack
export function neededEquipment(exercise: Pick<Exercise, "equipmentOptions">, tags: EquipmentTag[]): string {
  const owned = expandTags(tags);
  const missing = exercise.equipmentOptions
    .map((option) => option.filter((tag) => !owned.has(tag)))
    .filter((option) => option.length > 0)
    .map((option) => option.map((tag) => EQUIPMENT_LABELS[tag]).join(" + "));
  return [...new Set(missing)].join(" or ");
}
