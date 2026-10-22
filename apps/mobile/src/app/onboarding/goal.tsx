import { zodResolver } from "@hookform/resolvers/zod";
import { UserProfile } from "@fit/shared";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button, ButtonGroup, ButtonText } from "@/components/button";
import { Card } from "@/components/card";
import { RHFHelperText } from "@/components/hook-form";
import { Icon } from "@/components/icons";
import { LoadingButton } from "@/components/loading-button";
import { Pressable } from "@/components/pressable";
import { Screen } from "@/components/screen";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useCurrentUser } from "@/features/user/CurrentUserProvider";
import { StepHeader } from "@/features/onboarding/components/StepHeader";
import { daysPerWeekOptions, goalOptions } from "@/features/onboarding/options";
import { spacing } from "@/theme";

const GoalSchema = UserProfile.pick({ goal: true, daysPerWeek: true });

// Step 2 of onboarding: training goal and frequency
export default function GoalStep() {
  const { user, updateProfile } = useCurrentUser();
  const profile = user?.profile ?? {};
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Pick<UserProfile, "goal" | "daysPerWeek">>({
    resolver: zodResolver(GoalSchema),
    defaultValues: { goal: profile.goal, daysPerWeek: profile.daysPerWeek ?? 3 },
  });

  const onNext = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await updateProfile(values);
      router.push("/onboarding/injuries");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save, try again");
    }
  });

  return (
    <Screen scroll edges={["bottom"]}>
      <Stack flex spacing={8}>
        <StepHeader step={2} title="Your goal" subtitle="Pick what matters most right now. You can change it later." />

        <Controller
          name="goal"
          control={form.control}
          render={({ field, fieldState: { error: fieldError } }) => (
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
              <RHFHelperText error={fieldError && "Choose a goal"} />
            </Stack>
          )}
        />

        <Controller
          name="daysPerWeek"
          control={form.control}
          render={({ field }) => (
            <Stack spacing={3}>
              <Text weight="semiBold">Days per week</Text>
              <HStack spacing={2}>
                {daysPerWeekOptions.map((days) => (
                  <Button
                    key={days}
                    action={field.value === days ? "primary" : "secondary"}
                    accessibilityState={{ selected: field.value === days }}
                    onPress={() => field.onChange(days)}
                    style={{ flex: 1 }}
                  >
                    <ButtonText>{days}</ButtonText>
                  </Button>
                ))}
              </HStack>
            </Stack>
          )}
        />
      </Stack>
      <ButtonGroup space={2} style={{ marginTop: spacing[8] }}>
        {error && (
          <Text size="xs" color="danger" centered>
            {error}
          </Text>
        )}
        <LoadingButton label="Next" onPress={onNext} loading={form.formState.isSubmitting} />
      </ButtonGroup>
    </Screen>
  );
}
