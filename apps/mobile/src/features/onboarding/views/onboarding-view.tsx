import { useAuth } from "@clerk/expo";
import { Redirect, router } from "expo-router";
import { Screen } from "@/components/screen";
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
      <UserOnboardingForm exit={exit} />
    </Screen>
  );
}
