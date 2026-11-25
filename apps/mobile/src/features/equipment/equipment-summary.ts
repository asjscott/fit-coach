import { EQUIPMENT_LABELS, type BarAndPlates, type EquipmentProfile, type WeightUnit } from "@fit/shared";
import { sizeInUnit } from "./loads";

// One line for the user's equipment on Profile; a gym has every tag, so listing them says nothing
export function equipmentSummary(profile: EquipmentProfile | undefined, unit: WeightUnit): string {
  if (!profile) return "Not set";
  if (profile.location === "gym") return "Full gym";
  if (profile.tags.length === 0) return "No equipment";
  const { dumbbells } = profile.loads;
  return profile.tags
    .map((tag) =>
      tag === "dumbbells" && dumbbells?.kind === "bar_and_plates"
        ? `${EQUIPMENT_LABELS[tag]} (${barAndPlatesSummary(dumbbells, unit)})`
        : EQUIPMENT_LABELS[tag],
    )
    .join(", ");
}

// "2 × 4 lb bars, 4 × 3 lb and 4 × 5 lb plates"
function barAndPlatesSummary({ bars, barKg, plates }: BarAndPlates, unit: WeightUnit): string {
  const sized = (count: number, kg: number) => `${count} × ${sizeInUnit(kg, unit)} ${unit}`;
  const barsPart = `${sized(bars, barKg)} ${bars === 1 ? "bar" : "bars"}`;
  const sizes = [...plates].sort((a, b) => a.kg - b.kg).map(({ kg, count }) => sized(count, kg));
  if (!sizes.length) return barsPart;
  const list = sizes.length === 1 ? sizes[0] : `${sizes.slice(0, -1).join(", ")} and ${sizes.at(-1)}`;
  const total = plates.reduce((sum, { count }) => sum + count, 0);
  return `${barsPart}, ${list} ${total === 1 ? "plate" : "plates"}`;
}
