import { Goal } from "@fit/shared";
import { Controller, useFormContext } from "react-hook-form";
import { Card } from "@/components/card";
import { FormControl } from "@/components/form-control";
import { RHFHelperText, RHFLabel } from "@/components/hook-form";
import { Icon, type IconName } from "@/components/icons";
import { Pressable } from "@/components/pressable";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";

const goalDetails: Record<Goal, { label: string; description: string; icon: IconName }> = {
  lose_fat: { label: "Lose fat", description: "Drop body fat while holding on to strength.", icon: "flame" },
  build_muscle: { label: "Build muscle", description: "Add size with higher-volume training.", icon: "dumbbell" },
  recomp: { label: "Recomp", description: "Lose fat and gain muscle at the same time.", icon: "weight" },
  athletic: { label: "Athletic", description: "Get faster, more powerful and better conditioned.", icon: "target" },
};

export const goalOptions = Goal.options.map((value) => ({ value, ...goalDetails[value] }));

export const goalLabel = (goal: Goal) => goalDetails[goal].label;

// Large cards rather than a dropdown, so each goal can explain itself
export function UserGoalField({ label }: { label?: string }) {
  const { control } = useFormContext();
  return (
    <Controller
      name="goal"
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl isInvalid={!!error} isRequired>
          <RHFLabel label={label} />
          <Stack spacing={3} accessibilityRole="radiogroup">
            {goalOptions.map((option) => {
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
          <RHFHelperText error={error && "Choose a goal"} />
        </FormControl>
      )}
    />
  );
}
