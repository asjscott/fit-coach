import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { useCurrentUser } from "@/features/user/CurrentUserProvider";
import { UserLoadingScreen } from "@/features/user/components/UserLoadingScreen";
import { fonts, useTheme } from "@/theme";

// No redirect once onboarded: saving step 2 stamps onboardedAt, and step 3 must still be reachable
export default function OnboardingLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useCurrentUser();
  const { colors } = useTheme();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  if (!user) return <UserLoadingScreen />;
  return (
    <Stack
      screenOptions={{
        title: "",
        headerBackTitle: "Back",
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.semiBold },
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
