import { BAND_TAGS, BandLevel, EQUIPMENT_LABELS, type EquipmentTag, type WeightUnit } from "@fit/shared";
import { useFormContext, useWatch } from "react-hook-form";
import { Box } from "@/components/box";
import { RHFChipSelect, RHFMultiSelect, RHFTextField, type Option } from "@/components/hook-form";
import { HStack, Stack } from "@/components/stack";
import { bandLevelLabels, loadOptions } from "@/features/equipment/loads";
import { useWeightUnit } from "@/features/user/current-user-provider";

// Weights are offered and entered in the user's unit
const weightOptions = (weights: number[], unit: WeightUnit): Option[] =>
  weights.map((weight) => ({ value: String(weight), label: `${weight} ${unit}` }));

const dumbbellKindOptions: Option[] = [
  { value: "adjustable", label: "Adjustable" },
  { value: "fixed", label: "Fixed set" },
];

const bandLevelOptions: Option[] = BandLevel.options.map((value) => ({ value, label: bandLevelLabels[value] }));

// The weights for each selected piece of equipment, stored under loads.<tag>; every answer is optional
export function EquipmentLoadsField({ tags }: { tags: EquipmentTag[] }) {
  const { control } = useFormContext();
  // useWatch rather than watch(), which the React Compiler memoizes and so never updates
  const dumbbellKind = useWatch({ control, name: "loads.dumbbells.kind" });
  const has = (tag: EquipmentTag) => tags.includes(tag);
  const unit = useWeightUnit();
  const options = loadOptions(unit);

  return (
    <Stack spacing={5}>
      {has("dumbbells") && (
        <Stack spacing={3}>
          <RHFChipSelect name="loads.dumbbells.kind" label="Dumbbells" options={dumbbellKindOptions} single />
          {dumbbellKind === "adjustable" && (
            <HStack spacing={3} align="start">
              <Box flex>
                <RHFTextField name="loads.dumbbells.min" label={`Lightest (${unit})`} numeric />
              </Box>
              <Box flex>
                <RHFTextField name="loads.dumbbells.max" label={`Heaviest (${unit})`} numeric />
              </Box>
              <Box flex>
                <RHFTextField name="loads.dumbbells.step" label={`Step (${unit})`} numeric />
              </Box>
            </HStack>
          )}
          {dumbbellKind === "fixed" && (
            <RHFMultiSelect
              name="loads.dumbbells.weights"
              label="Weights you have"
              placeholder="Select weights"
              options={weightOptions(options.dumbbells, unit)}
            />
          )}
        </Stack>
      )}

      {has("kettlebells") && (
        <RHFMultiSelect
          name="loads.kettlebells.weights"
          label="Kettlebells"
          placeholder="Select weights"
          options={weightOptions(options.kettlebells, unit)}
        />
      )}

      {has("barbell") && (
        <Stack spacing={3}>
          <RHFChipSelect
            name="loads.barbell.bar"
            label="Barbell weight"
            options={weightOptions(options.bar, unit)}
            single
          />
          {has("plates") && (
            <RHFMultiSelect
              name="loads.barbell.plates"
              label="Plates you have"
              helperText="Pick each size you have a pair of"
              placeholder="Select plates"
              options={weightOptions(options.plates, unit)}
            />
          )}
        </Stack>
      )}

      {BAND_TAGS.filter(has).map((tag) => (
        <RHFChipSelect
          key={tag}
          name={`loads.${tag}.levels`}
          label={EQUIPMENT_LABELS[tag]}
          options={bandLevelOptions}
        />
      ))}
    </Stack>
  );
}
