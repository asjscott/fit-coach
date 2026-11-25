import { EQUIPMENT_LABELS, type EquipmentTag, type Exercise } from "@fit/shared";
import { expandTags, hasTooFewDumbbells, type ProfileWithLoads } from "@fit/engines";

// What's missing for each of the exercise's equipment options, e.g. "Pull-up bar or Gymnastic rings", or "Two
// dumbbells" with the bar for one. Uses the same rules as isAvailable, so a power rack covers a squat rack
export function neededEquipment(
  exercise: Pick<Exercise, "equipmentOptions" | "dumbbells">,
  equipmentProfile: ProfileWithLoads,
): string {
  const owned = expandTags(equipmentProfile.tags);
  const needsAnother = owned.has("dumbbells") && hasTooFewDumbbells(exercise, equipmentProfile);
  if (needsAnother) owned.delete("dumbbells");
  const label = (tag: EquipmentTag) => (needsAnother && tag === "dumbbells" ? "Two dumbbells" : EQUIPMENT_LABELS[tag]);
  const missing = exercise.equipmentOptions
    .map((option) => option.filter((tag) => !owned.has(tag)))
    .filter((option) => option.length > 0)
    .map((option) => option.map(label).join(" + "));
  return [...new Set(missing)].join(" or ");
}
