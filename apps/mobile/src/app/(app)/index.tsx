import { useEffect, useState } from "react";
import { HealthResponse, Me } from "@fit/shared";
import { useAuth } from "@clerk/expo";
import { ButtonGroup } from "@/components/button";
import { Card } from "@/components/card";
import { Heading } from "@/components/heading";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { Stack } from "@/components/stack";
import { Text } from "@/components/text";
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
      <Stack spacing={6} flex>
        <Heading size="3xl">Fit Coach</Heading>
        <Card>
          <Text size="xs" weight="medium" color="textSubtle">
            ACCOUNT
          </Text>
          <Text weight="semiBold">{me}</Text>
        </Card>
        <Card>
          <Text size="xs" weight="medium" color="textSubtle">
            STATUS
          </Text>
          <Text weight="semiBold">{status}</Text>
        </Card>
      </Stack>
      <ButtonGroup space={2}>
        {__DEV__ && (
          <LoadingButton label="Components" action="secondary" icon="settings" href="/styleguide" />
        )}
        <LoadingButton label="Sign out" action="default" icon="signOut" onPress={() => signOut()} />
      </ButtonGroup>
    </Screen>
  );
}
