import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

export default function OnboardingLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  return <Stack screenOptions={{ title: "Set up", headerBackTitle: "Back" }} />;
}