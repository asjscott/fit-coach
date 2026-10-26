import { BAND_TAGS, BandLevel, EQUIPMENT_LABELS, type EquipmentTag } from "@fit/shared";
import { useFormContext, useWatch } from "react-hook-form";
import { Box } from "@/components/box";
import { RHFChipSelect, RHFMultiSelect, RHFTextField, type Option } from "@/components/hook-form";
import { HStack, Stack } from "@/components/stack";
import {
  bandLevelLabels,
  barWeightsKg,
  dumbbellWeightsKg,
  kettlebellWeightsKg,
  plateWeightsKg,
} from "@/features/equipment/loads";

const kgOptions = (weights: number[]): Option[] => weights.map((kg) => ({ value: String(kg), label: `${kg} kg` }));

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

  return (
    <Stack spacing={5}>
      {has("dumbbells") && (
        <Stack spacing={3}>
          <RHFChipSelect name="loads.dumbbells.kind" label="Dumbbells" options={dumbbellKindOptions} single />
          {dumbbellKind === "adjustable" && (
            <HStack spacing={3} align="start">
              <Box flex>
                <RHFTextField name="loads.dumbbells.minKg" label="Lightest (kg)" numeric />
              </Box>
              <Box flex>
                <RHFTextField name="loads.dumbbells.maxKg" label="Heaviest (kg)" numeric />
              </Box>
              <Box flex>
                <RHFTextField name="loads.dumbbells.stepKg" label="Step (kg)" numeric />
              </Box>
            </HStack>
          )}
          {dumbbellKind === "fixed" && (
            <RHFMultiSelect
              name="loads.dumbbells.weightsKg"
              label="Weights you have"
              placeholder="Select weights"
              options={kgOptions(dumbbellWeightsKg)}
            />
          )}
        </Stack>
      )}

      {has("kettlebells") && (
        <RHFMultiSelect
          name="loads.kettlebells.weightsKg"
          label="Kettlebells"
          placeholder="Select weights"
          options={kgOptions(kettlebellWeightsKg)}
        />
      )}

      {has("barbell") && (
        <Stack spacing={3}>
          <RHFChipSelect name="loads.barbell.barKg" label="Barbell weight" options={kgOptions(barWeightsKg)} single />
          {has("plates") && (
            <RHFMultiSelect
              name="loads.barbell.platesKg"
              label="Plates you have"
              helperText="Pick each size you have a pair of"
              placeholder="Select plates"
              options={kgOptions(plateWeightsKg)}
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
