import { useAuth } from "@clerk/expo";
import { Redirect, router } from "expo-router";
import { Pressable } from "@/components/pressable";
import { Screen } from "@/components/screen";
import { HStack } from "@/components/stack";
import { Text } from "@/components/text";
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
    ? { label: "Cancel", onPress: () => (router.canGoBack() ? router.back() : router.replace("/profile")) }
    : { label: "Sign out", onPress: () => signOut() };

  return (
    <Screen scroll="content">
      {/* Body-sized and muted so it doesn't compete with the stage's title, in a row a touch target tall (#56) */}
      <HStack justify="end">
        <Pressable
          accessibilityRole="button"
          onPress={exit.onPress}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text weight="medium" color="muted">
            {exit.label}
          </Text>
        </Pressable>
      </HStack>
      <UserOnboardingForm />
    </Screen>
  );
}
