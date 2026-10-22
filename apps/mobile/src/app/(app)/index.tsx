import { useEffect, useState } from "react";
import { HealthResponse } from "@fit/shared";
import { useAuth } from "@clerk/expo";
import { ButtonGroup } from "@/components/button";
import { Card } from "@/components/card";
import { Heading } from "@/components/heading";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useCurrentUser } from "@/features/user/CurrentUserProvider";
import { goalLabel, injuryLabel, sexOptions } from "@/features/onboarding/options";
import { spacing } from "@/theme";
import { useApi } from "../../../api/api";

export default function Home() {
  const { signOut } = useAuth();
  const { user } = useCurrentUser();
  const api = useApi();
  const [status, setStatus] = useState("Checking API…");

  useEffect(() => {
    api("/health")
      .then((json) => {
        const health = HealthResponse.parse(json);
        setStatus(`API ${health.status} · DB ${health.db}`);
      })
      .catch((err: Error) => setStatus(`Error: ${err.message}`));
  }, [api]);

  // The layout only renders this screen once the user is loaded and onboarded
  if (!user?.onboardedAt) return null;
  const { profile } = user;

  return (
    <Screen scroll>
      <Stack spacing={6} flex>
        <Heading size="3xl">Fit Coach</Heading>
        <Card>
          <Text size="xs" weight="medium" color="textSubtle">
            YOUR PLAN
          </Text>
          <Text size="xl" weight="bold">
            {profile.goal && goalLabel(profile.goal)}
          </Text>
          <Text color="textMuted">{profile.daysPerWeek} training days per week</Text>
        </Card>
        <Card>
          <Text size="xs" weight="medium" color="textSubtle">
            PROFILE
          </Text>
          <Row label="Sex" value={sexOptions.find((o) => o.value === profile.sex)?.label} />
          <Row label="Age" value={profile.birthYear && `${new Date().getFullYear() - profile.birthYear}`} />
          <Row label="Height" value={profile.heightCm && `${profile.heightCm} cm`} />
          <Row label="Weight" value={profile.weightKg && `${profile.weightKg} kg`} />
          <Row
            label="Injuries"
            value={profile.injuries?.length ? profile.injuries.map(injuryLabel).join(", ") : "None"}
          />
          <Text size="xs" color="textSubtle">
            Member since {new Date(user.onboardedAt).toLocaleDateString()}
          </Text>
        </Card>
        <Card>
          <Text size="xs" weight="medium" color="textSubtle">
            STATUS
          </Text>
          <Text weight="semiBold">{status}</Text>
        </Card>
      </Stack>
      <ButtonGroup space={2} style={{ marginTop: spacing[6] }}>
        <LoadingButton label="Edit profile" action="secondary" icon="user" href="/onboarding" />
        {__DEV__ && (
          <LoadingButton label="Components" action="secondary" icon="settings" href="/styleguide" />
        )}
        <LoadingButton label="Sign out" action="default" icon="signOut" onPress={() => signOut()} />
      </ButtonGroup>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value?: string | number }) {
  return (
    <HStack justify="between" spacing={4}>
      <Text color="textMuted">{label}</Text>
      <Text weight="semiBold" style={{ flexShrink: 1, textAlign: "right" }}>
        {value || "—"}
      </Text>
    </HStack>
  );
}
