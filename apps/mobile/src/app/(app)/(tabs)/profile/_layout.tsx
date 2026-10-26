import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/use-stack-screen-options";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: "Profile" }} />
      <Stack.Screen name="styleguide" options={{ title: "Components" }} />
    </Stack>
  );
}
