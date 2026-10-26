import { EQUIPMENT_LABELS, type EquipmentProfile } from "@fit/shared";

// One line for the user's equipment on Profile; a gym has every tag, so listing them says nothing
export function equipmentSummary(profile: EquipmentProfile | undefined): string {
  if (!profile) return "Not set";
  if (profile.location === "gym") return "Full gym";
  if (profile.tags.length === 0) return "No equipment";
  return profile.tags.map((tag) => EQUIPMENT_LABELS[tag]).join(", ");
}
