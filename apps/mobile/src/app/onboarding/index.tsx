import { zodResolver } from "@hookform/resolvers/zod";
import { UserProfile } from "@fit/shared";
import { router } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Box } from "@/components/box";
import { ButtonGroup } from "@/components/button";
import { FormProvider, RHFChipSelect, RHFTextField } from "@/components/hook-form";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useCurrentUser } from "@/features/user/CurrentUserProvider";
import { StepHeader } from "@/features/onboarding/components/StepHeader";
import { sexOptions } from "@/features/onboarding/options";
import { spacing } from "@/theme";

const BodySchema = UserProfile.pick({ sex: true, birthYear: true, heightCm: true, weightKg: true });

// Step 1 of onboarding: body stats
export default function BodyStep() {
  const { user, updateProfile } = useCurrentUser();
  const profile = user?.profile ?? {};
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Pick<UserProfile, "sex" | "birthYear" | "heightCm" | "weightKg">>({
    resolver: zodResolver(BodySchema),
    defaultValues: {
      sex: profile.sex,
      birthYear: profile.birthYear,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
    },
  });

  const onNext = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await updateProfile(values);
      router.push("/onboarding/goal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save, try again");
    }
  });

  return (
    <Screen scroll edges={["bottom"]}>
      <Stack flex spacing={8}>
        <StepHeader step={1} title="About you" subtitle="We use these to set your starting weights and volume." />
        <FormProvider form={form}>
          <Stack spacing={5}>
            <RHFChipSelect name="sex" label="Sex" options={sexOptions} single required />
            <RHFTextField
              name="birthYear"
              label="Birth year"
              placeholder="e.g. 1990"
              keyboardType="number-pad"
              numeric
              required
            />
            <HStack spacing={3} align="start">
              <Box flex>
                <RHFTextField name="heightCm" label="Height (cm)" numeric required />
              </Box>
              <Box flex>
                <RHFTextField name="weightKg" label="Weight (kg)" numeric required />
              </Box>
            </HStack>
          </Stack>
        </FormProvider>
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
