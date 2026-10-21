import { useHostedAuth } from "@clerk/expo/hosted-auth";
import { useState } from "react";
import { Box, Button, Screen, Stack, Text } from "@/components/ui";

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
      <Box flex={1} justify="center" gap="sm">
        <Text variant="display">Fit Coach</Text>
        <Text color="textMuted">Training that adapts to you.</Text>
      </Box>
      <Stack>
        <Button title="Create account" onPress={() => start("sign-up")} />
        <Button title="Sign in" variant="secondary" onPress={() => start("sign-in")} />
        {error && (
          <Text variant="caption" color="danger" align="center">
            {error}
          </Text>
        )}
      </Stack>
    </Screen>
  );
}
