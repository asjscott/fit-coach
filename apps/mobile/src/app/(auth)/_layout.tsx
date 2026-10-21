import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { colors } = useTheme();

  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
