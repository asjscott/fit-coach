import { EQUIPMENT_GROUPS, EQUIPMENT_LABELS, type EquipmentGroupKey } from "@fit/shared";
import { RHFMultiSelect } from "@/components/hook-form";

// One multi-select dropdown per group, stored under equipment.<group key>; nothing selected is valid
export function EquipmentTagsField({ groups }: { groups: EquipmentGroupKey[] }) {
  return EQUIPMENT_GROUPS.filter((group) => groups.includes(group.key)).map((group) => (
    <RHFMultiSelect
      key={group.key}
      name={`equipment.${group.key}`}
      label={group.name}
      placeholder="None"
      options={group.tags.map((tag) => ({ value: tag, label: EQUIPMENT_LABELS[tag] }))}
    />
  ));
}
