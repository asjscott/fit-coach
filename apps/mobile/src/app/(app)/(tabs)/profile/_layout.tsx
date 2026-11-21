import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/use-stack-screen-options";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: "Profile" }} />
      {/* The Exercise library is Profile's first row rather than a tab (#159) */}
      <Stack.Screen name="exercises/index" options={{ title: "Exercise library" }} />
      {/* Title is set to the exercise name once it loads */}
      <Stack.Screen name="exercises/[slug]" options={{ title: "" }} />
      <Stack.Screen name="styleguide" options={{ title: "Components" }} />
    </Stack>
  );
}
