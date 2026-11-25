import { MAX_DUMBBELL_PLATE_SIZES } from "@fit/shared";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Box } from "@/components/box";
import { Button, ButtonIcon, ButtonText } from "@/components/button";
import { RHFTextField } from "@/components/hook-form";
import { Icon } from "@/components/icons";
import { Pressable } from "@/components/pressable";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import type { LoadsForm } from "@/features/equipment/loads";
import { useWeightUnit } from "@/features/user/current-user-provider";

// Bar-and-plates dumbbells: the bars, then a row for each size of plate, any size the user types
export function BarAndPlatesField() {
  const { control } = useFormContext<{ loads: LoadsForm }>();
  const { fields, append, remove } = useFieldArray({ control, name: "loads.dumbbells.plates" });
  const unit = useWeightUnit();

  return (
    <Stack spacing={3}>
      <HStack spacing={3} align="start">
        <Box flex>
          <RHFTextField name="loads.dumbbells.bar" label={`Bar with collars (${unit})`} numeric />
        </Box>
        <Box flex>
          <RHFTextField name="loads.dumbbells.bars" label="Number of bars" numeric />
        </Box>
      </HStack>
      <Text size="sm" color="muted">
        Count every plate of each size, for all your bars together.
      </Text>
      {fields.map((field, i) => (
        <HStack key={field.id} spacing={3} align="start">
          <Box flex>
            <RHFTextField name={`loads.dumbbells.plates.${i}.size`} label={`Plate (${unit})`} numeric />
          </Box>
          <Box flex>
            <RHFTextField name={`loads.dumbbells.plates.${i}.count`} label="How many" numeric />
          </Box>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove plate ${i + 1}`}
            onPress={() => remove(i)}
            // Level with the row's inputs, under their labels
            style={{ width: 44, height: 44, marginTop: 28, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="trash" color="danger" size={20} />
          </Pressable>
        </HStack>
      ))}
      {fields.length < MAX_DUMBBELL_PLATE_SIZES && (
        <Button
          action="secondary"
          onPress={() => append({ size: null, count: null }, { shouldFocus: false })}
          style={{ alignSelf: "flex-start" }}
        >
          <ButtonIcon name="plus" />
          <ButtonText>Add plates</ButtonText>
        </Button>
      )}
    </Stack>
  );
}
