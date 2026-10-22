import type { InjuryTag } from "@fit/shared";
import { router } from "expo-router";
import { useState } from "react";
import { ButtonGroup } from "@/components/button";
import { Chip } from "@/components/chip";
import { Grid, GridItem } from "@/components/grid";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useCurrentUser } from "@/features/user/CurrentUserProvider";
import { StepHeader } from "@/features/onboarding/components/StepHeader";
import { injuryOptions } from "@/features/onboarding/options";
import { spacing } from "@/theme";

// Step 3 of onboarding: injuries to train around
export default function InjuriesStep() {
  const { user, updateProfile } = useCurrentUser();
  const saved = user?.profile.injuries;
  const [injuries, setInjuries] = useState<InjuryTag[]>(saved ?? []);
  // An empty list only counts as an answer once "None" has been chosen
  const [none, setNone] = useState(saved?.length === 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (injury: InjuryTag) => {
    setNone(false);
    setInjuries((current) =>
      current.includes(injury) ? current.filter((i) => i !== injury) : [...current, injury],
    );
  };

  const chooseNone = () => {
    setNone(true);
    setInjuries([]);
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      // The server sets onboardedAt once the required profile fields are saved
      const updated = await updateProfile({ injuries });
      if (!updated.onboardedAt) throw new Error("Some earlier answers are missing, go back and check them");
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save, try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll edges={["bottom"]}>
      <Stack flex spacing={8}>
        <StepHeader
          step={3}
          title="Any injuries?"
          subtitle="Select anything that hurts or limits you, and we'll program around it."
        />
        <Grid columns={2} gap={2}>
          {injuryOptions.map((option) => (
            <GridItem key={option.value}>
              <Chip
                label={option.label}
                selected={injuries.includes(option.value)}
                onPress={() => toggle(option.value)}
              />
            </GridItem>
          ))}
          <GridItem span={2}>
            <Chip label="None" selected={none} onPress={chooseNone} />
          </GridItem>
        </Grid>
      </Stack>
      <ButtonGroup space={2} style={{ marginTop: spacing[8] }}>
        {error && (
          <Text size="xs" color="danger" centered>
            {error}
          </Text>
        )}
        <LoadingButton
          label="Finish"
          onPress={finish}
          loading={saving}
          disabled={!none && injuries.length === 0}
        />
      </ButtonGroup>
    </Screen>
  );
}
