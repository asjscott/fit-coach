import { EQUIPMENT_GROUPS, PRESETS, type EquipmentTag } from "@fit/shared";
import { useFormContext, useWatch } from "react-hook-form";
import { Chip } from "@/components/chip";
import { FormControl } from "@/components/form-control";
import { RHFLabel } from "@/components/hook-form";
import { Stack } from "@/components/stack";
import type { EquipmentByGroup } from "@/features/equipment/training-setup";

const sameTags = (a: EquipmentTag[], b: EquipmentTag[]) => a.length === b.length && a.every((tag) => b.includes(tag));

// Tapping a preset replaces the whole selection with its tags; the user can then add or remove
export function EquipmentPresetsField({ label = "Start from a preset" }: { label?: string }) {
  const { control, setValue } = useFormContext();
  // useWatch rather than watch(), which the React Compiler memoizes and so never updates
  const equipment: EquipmentByGroup = useWatch({ control, name: "equipment" }) ?? {};
  const selected = Object.values(equipment).flat();

  const apply = (tags: EquipmentTag[]) => {
    for (const group of EQUIPMENT_GROUPS) {
      const groupTags: readonly EquipmentTag[] = group.tags;
      setValue(`equipment.${group.key}`, tags.filter((tag) => groupTags.includes(tag)), { shouldDirty: true });
    }
  };

  return (
    <FormControl>
      <RHFLabel label={label} />
      <Stack direction="row" wrap="wrap" spacing={2}>
        {PRESETS.map((preset) => (
          <Chip
            key={preset.name}
            label={preset.name}
            selected={sameTags(selected, preset.tags)}
            onPress={() => apply(preset.tags)}
          />
        ))}
      </Stack>
    </FormControl>
  );
}
