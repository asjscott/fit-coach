// PROTOTYPE (M7), throwaway: the Food tab's Stack
import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/use-stack-screen-options";

export default function FoodLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: "Food" }} />
    </Stack>
  );
}
