import { EQUIPMENT_GROUPS, PRESETS, type EquipmentTag } from "@fit/shared";
import { useFormContext, useWatch } from "react-hook-form";
import { FormControl } from "@/components/form-control";
import { RHFLabel } from "@/components/hook-form";
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectScrollView,
  SelectTrigger,
} from "@/components/select";
import type { EquipmentByGroup } from "@/features/equipment/training-setup";

const sameTags = (a: EquipmentTag[], b: EquipmentTag[]) => a.length === b.length && a.every((tag) => b.includes(tag));

// Picking a preset replaces the whole selection with its tags; the user can then add or remove
export function EquipmentPresetsField({ label = "Start from a preset" }: { label?: string }) {
  const { control, setValue } = useFormContext();
  // useWatch rather than watch(), which the React Compiler memoizes and so never updates
  const equipment: EquipmentByGroup = useWatch({ control, name: "equipment" }) ?? {};
  const selected = Object.values(equipment).flat();
  const current = PRESETS.find((preset) => sameTags(selected, preset.tags));

  const apply = (name: string) => {
    const tags = PRESETS.find((preset) => preset.name === name)?.tags ?? [];
    for (const group of EQUIPMENT_GROUPS) {
      const groupTags: readonly EquipmentTag[] = group.tags;
      setValue(
        `equipment.${group.key}`,
        tags.filter((tag) => groupTags.includes(tag)),
        { shouldDirty: true },
      );
    }
  };

  return (
    <FormControl inline>
      <RHFLabel label={label} />
      <Select selectedValue={current?.name ?? null} onValueChange={apply}>
        <SelectTrigger>
          <SelectInput value={current?.name} placeholder="Custom" />
          <SelectIcon />
        </SelectTrigger>
        <SelectPortal>
          <SelectBackdrop />
          <SelectContent>
            <SelectDragIndicatorWrapper>
              <SelectDragIndicator />
            </SelectDragIndicatorWrapper>
            <SelectScrollView>
              {PRESETS.map((preset) => (
                <SelectItem key={preset.name} value={preset.name} label={preset.name} />
              ))}
            </SelectScrollView>
          </SelectContent>
        </SelectPortal>
      </Select>
    </FormControl>
  );
}
