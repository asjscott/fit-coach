import { useClerk } from "@clerk/expo";
import { useHostedAuth } from "@clerk/expo/hosted-auth";
import { isRunningInExpoGo } from "expo";
import Constants from "expo-constants";
import type { AuthSessionOpenOptions } from "expo-web-browser";
import { useState } from "react";
import { Platform } from "react-native";
import { ButtonGroup } from "@/components/button";
import { Heading } from "@/components/heading";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { hostedAuthRedirectUrl } from "@/features/auth/hosted-auth-redirect";
import { errorMessage } from "@/utils/error-message";

// On Android, opens Account Portal in a Custom Tab directly rather than through expo-web-browser's proxy activity.
// The proxy's task outlives a sign-in that returns by link, and the next sign-in brings that finished tab back
// instead of opening a new one (#44). Clerk passes these on to openAuthSessionAsync but only types some of them
const AUTH_SESSION_OPTIONS: AuthSessionOpenOptions = { useProxyActivity: false };

export default function SignInScreen() {
  const clerk = useClerk();
  const { startHostedAuth } = useHostedAuth();
  const [error, setError] = useState<string | null>(null);

  const start = async (mode: "sign-in" | "sign-up") => {
    try {
      setError(null);
      // Hosted auth needs a custom-scheme callback, which the web has no equivalent of,
      // so the browser navigates to Account Portal and back instead
      if (Platform.OS === "web") {
        await (mode === "sign-in" ? clerk.redirectToSignIn() : clerk.redirectToSignUp());
        return;
      }
      const redirectUrl = hostedAuthRedirectUrl({
        inExpoGo: isRunningInExpoGo(),
        hostUri: Constants.expoConfig?.hostUri,
      });
      await startHostedAuth({ mode, redirectUrl, authSessionOptions: AUTH_SESSION_OPTIONS });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Screen>
      <Stack flex justify="center" spacing={2}>
        <Heading size="3xl">Fit Coach</Heading>
        <Text color="muted">Training that adapts to you.</Text>
      </Stack>
      <ButtonGroup space={3}>
        <LoadingButton label="Create account" onPress={() => start("sign-up")} />
        <LoadingButton label="Sign in" action="secondary" onPress={() => start("sign-in")} />
        {!!error && (
          <Text size="xs" color="danger" centered>
            {error}
          </Text>
        )}
      </ButtonGroup>
    </Screen>
  );
}
