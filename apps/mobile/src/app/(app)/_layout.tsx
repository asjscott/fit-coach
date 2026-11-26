import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { UserLoadingScreen } from "@/features/user/components/user-loading-screen";
import { HistoryProvider } from "@/features/workouts/history-provider";
import { LogbookProvider } from "@/features/workouts/logbook-provider";
import { useStackScreenOptions } from "@/hooks/use-stack-screen-options";
import { useTheme } from "@/theme";

// A Workout opened by a link still has the tabs under it to leave to
export const unstable_settings = { initialRouteName: "(tabs)" };

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useCurrentUser();
  const { colors } = useTheme();
  const stackScreenOptions = useStackScreenOptions();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  if (!user) return <UserLoadingScreen />;
  if (!user.onboardedAt) return <Redirect href="/onboarding" />;
  return (
    <LogbookProvider>
      <HistoryProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          {/* The In-progress Workout and its picker and Finish screens cover the tabs */}
          <Stack.Screen name="workout" options={{ presentation: "fullScreenModal" }} />
          {/* Over the tabs, so the Food tab itself never opens on it */}
          <Stack.Screen
            name="nutrition-history"
            options={{
              ...stackScreenOptions,
              headerShown: true,
              title: "Nutrition History",
              headerBackButtonDisplayMode: "minimal",
            }}
          />
          {/* PROTOTYPE (M8): the Week Summary screen, throwaway */}
          <Stack.Screen
            name="prototype-week-summary"
            options={{
              ...stackScreenOptions,
              headerShown: true,
              title: "Week Summary",
              headerBackButtonDisplayMode: "minimal",
            }}
          />
          <Stack.Screen
            name="assessment-results"
            // A bare chevron: the back title would be "(tabs)", the route group's name
            options={{
              ...stackScreenOptions,
              headerShown: true,
              title: "Assessment results",
              headerBackButtonDisplayMode: "minimal",
            }}
          />
        </Stack>
      </HistoryProvider>
    </LogbookProvider>
  );
}
