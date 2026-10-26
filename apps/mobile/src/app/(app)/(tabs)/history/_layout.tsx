import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/use-stack-screen-options";

export default function HistoryLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: "History" }} />
      <Stack.Screen name="[id]" options={{ title: "Workout" }} />
    </Stack>
  );
}
