import { useAuth } from "@clerk/expo";
import { ButtonGroup } from "@/components/button";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { Spinner } from "@/components/spinner";
import { Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useCurrentUser } from "../current-user-provider";

// Shown while the user record loads, or with a retry if loading failed
export function UserLoadingScreen() {
  const { error, refresh } = useCurrentUser();
  const { signOut } = useAuth();

  if (!error) {
    return (
      <Screen>
        <Stack flex centered>
          <Spinner size="lg" />
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack flex centered spacing={2}>
        <Text weight="semiBold">Couldn't load your account</Text>
        <Text size="sm" color="textMuted" centered>
          {error}
        </Text>
      </Stack>
      <ButtonGroup space={2}>
        <LoadingButton label="Try again" onPress={refresh} />
        <LoadingButton label="Sign out" action="default" onPress={() => signOut()} />
      </ButtonGroup>
    </Screen>
  );
}
