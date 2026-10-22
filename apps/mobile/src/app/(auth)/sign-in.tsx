import { useHostedAuth } from "@clerk/expo/hosted-auth";
import { useState } from "react";
import { ButtonGroup } from "@/components/button";
import { Heading } from "@/components/heading";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { Stack } from "@/components/stack";
import { Text } from "@/components/text";

export default function SignInScreen() {
  const { startHostedAuth } = useHostedAuth();
  const [error, setError] = useState<string | null>(null);

  const start = async (mode: "sign-in" | "sign-up") => {
    try {
      setError(null);
      await startHostedAuth({ mode });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Screen>
      <Stack flex justify="center" spacing={2}>
        <Heading size="3xl">Fit Coach</Heading>
        <Text color="textMuted">Training that adapts to you.</Text>
      </Stack>
      <ButtonGroup space={3}>
        <LoadingButton label="Create account" onPress={() => start("sign-up")} />
        <LoadingButton label="Sign in" action="secondary" onPress={() => start("sign-in")} />
        {error && (
          <Text size="xs" color="danger" centered>
            {error}
          </Text>
        )}
      </ButtonGroup>
    </Screen>
  );
}
