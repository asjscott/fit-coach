import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/use-stack-screen-options";

export default function ExercisesLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: "Exercises" }} />
      {/* Title is set to the exercise name once it loads */}
      <Stack.Screen name="[slug]" options={{ title: "" }} />
    </Stack>
  );
}
