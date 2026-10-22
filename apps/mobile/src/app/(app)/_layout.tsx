import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { fonts, useTheme } from "@/theme";

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { colors } = useTheme();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.semiBold },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="styleguide" options={{ title: "Components" }} />
    </Stack>
  );
}
