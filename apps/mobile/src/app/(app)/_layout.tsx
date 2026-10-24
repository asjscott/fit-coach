import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { UserLoadingScreen } from "@/features/user/components/user-loading-screen";
import { LogbookProvider } from "@/features/workouts/logbook-provider";
import { fonts, useTheme } from "@/theme";

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useCurrentUser();
  const { colors } = useTheme();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  if (!user) return <UserLoadingScreen />;
  if (!user.onboardedAt) return <Redirect href="/onboarding" />;
  return (
    <LogbookProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: fonts.semiBold },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="exercises/index" options={{ title: "Exercises" }} />
        {/* Title is set to the exercise name once it loads */}
        <Stack.Screen name="exercises/[slug]" options={{ title: "" }} />
        <Stack.Screen name="workout/index" options={{ title: "Workout" }} />
        <Stack.Screen name="workout/add-exercise" options={{ title: "Add exercise", presentation: "modal" }} />
        <Stack.Screen name="workout/finish" options={{ title: "Finish workout" }} />
        <Stack.Screen name="styleguide" options={{ title: "Components" }} />
      </Stack>
    </LogbookProvider>
  );
}
