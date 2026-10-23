import { Controller, useFormContext } from "react-hook-form";
import { Card } from "@/components/card";
import { FormControl } from "@/components/form-control";
import { RHFHelperText, RHFLabel } from "@/components/hook-form";
import { Icon, type IconName } from "@/components/icons";
import { Pressable } from "@/components/pressable";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { TrainingSetup } from "@/features/equipment/training-setup";

const setupDetails: Record<TrainingSetup, { label: string; description: string; icon: IconName }> = {
  gym: { label: "Gym", description: "A commercial gym with a full range of equipment.", icon: "dumbbell" },
  home: { label: "Home", description: "Your own space, with whatever equipment you've got.", icon: "home" },
  bodyweight: { label: "Bodyweight only", description: "No weights, just you and maybe a bar or rings.", icon: "user" },
};

export const trainingSetupOptions = TrainingSetup.options.map((value) => ({ value, ...setupDetails[value] }));

// Large cards rather than chips, so each setup can explain itself
export function TrainingSetupField({ label }: { label?: string }) {
  const { control } = useFormContext();
  return (
    <Controller
      name="trainingSetup"
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl isInvalid={!!error} isRequired>
          <RHFLabel label={label} />
          <Stack spacing={3} accessibilityRole="radiogroup">
            {trainingSetupOptions.map((option) => {
              const selected = field.value === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => field.onChange(option.value)}
                >
                  <Card size="lg" selected={selected}>
                    <HStack spacing={4}>
                      <Icon name={option.icon} color={selected ? "orange" : "textMuted"} />
                      <Stack flex spacing={1}>
                        <Text size="lg" weight="semiBold">
                          {option.label}
                        </Text>
                        <Text size="sm" color="textMuted">
                          {option.description}
                        </Text>
                      </Stack>
                    </HStack>
                  </Card>
                </Pressable>
              );
            })}
          </Stack>
          <RHFHelperText error={error?.message} />
        </FormControl>
      )}
    />
  );
}
