import { useEffect, useState } from "react";
import { router } from "expo-router";
import { HealthResponse, Me } from "@fit/shared";
import { useAuth } from "@clerk/expo";
import { Box, Button, Card, Screen, Stack, Text } from "@/components/ui";
import { useApi } from "../../../api/api";

export default function Home() {
  const { signOut } = useAuth();
  const api = useApi();
  const [status, setStatus] = useState("Checking API…");
  const [me, setMe] = useState("Loading user…");

  useEffect(() => {
    api("/health")
      .then((json) => {
        const health = HealthResponse.parse(json);
        setStatus(`API ${health.status} · DB ${health.db}`);
      })
      .catch((err: Error) => setStatus(`Error: ${err.message}`));

    api("/me")
      .then((json) => {
        const user = Me.parse(json);
        const display = !user.onboardedAt ? "Onboarding not complete" : user.id;
        setMe(display);
      })
      .catch((err: Error) => setMe(`Error: ${err.message}`));
  }, [api]);

  return (
    <Screen>
      <Stack gap="xl" flex={1}>
        <Text variant="display">Fit Coach</Text>
        <Card>
          <Text variant="caption" color="textSubtle">
            ACCOUNT
          </Text>
          <Text variant="bodyStrong">{me}</Text>
        </Card>
        <Card>
          <Text variant="caption" color="textSubtle">
            STATUS
          </Text>
          <Text variant="bodyStrong">{status}</Text>
        </Card>
      </Stack>
      <Box gap="sm">
        {__DEV__ && (
          <Button title="Style guide" variant="secondary" onPress={() => router.push("/styleguide")} />
        )}
        <Button title="Sign out" variant="ghost" onPress={() => signOut()} />
      </Box>
    </Screen>
  );
}
