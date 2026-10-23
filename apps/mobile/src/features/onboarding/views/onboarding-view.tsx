import { useAuth } from "@clerk/expo";
import { Redirect, router } from "expo-router";
import { Button, ButtonText } from "@/components/button";
import { Screen } from "@/components/screen";
import { HStack } from "@/components/stack";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { UserLoadingScreen } from "@/features/user/components/user-loading-screen";
import { UserOnboardingForm } from "../form/user-onboarding-form";

// Doesn't redirect onboarded users away: "Edit profile" reuses this flow
export function OnboardingView() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useCurrentUser();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  if (!user) return <UserLoadingScreen />;

  // Signing out is the only way off this screen before onboarding is done
  const exit = user.onboardedAt
    ? { label: "Cancel", onPress: () => router.replace("/") }
    : { label: "Sign out", onPress: () => signOut() };

  return (
    <Screen>
      <HStack justify="end">
        <Button action="default" variant="link" size="sm" onPress={exit.onPress}>
          <ButtonText>{exit.label}</ButtonText>
        </Button>
      </HStack>
      <UserOnboardingForm />
    </Screen>
  );
}
