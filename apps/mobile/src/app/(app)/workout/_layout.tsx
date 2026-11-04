import { Stack } from "expo-router";
import { Fragment } from "react";
import { Platform } from "react-native";
import { Column } from "@/components/column";
import { Icon } from "@/components/icons";
import { Pressable } from "@/components/pressable";
import { SafeAreaProvider } from "@/components/safe-area-view";
import { useLeaveWorkout } from "@/features/workouts/hooks/use-leave-workout";
import { useStackScreenOptions } from "@/hooks/use-stack-screen-options";

// iOS hosts a presented modal outside the app's provider, and a SafeAreaView with no provider above it can keep a zero
// bottom inset (#68). Android has shown no gap, and web's static build keeps Expo Router's non-measuring provider
const IosModalSafeArea = Platform.OS === "ios" ? SafeAreaProvider : Fragment;

// Finish and the picker opened by a link still have the Workout under them
export const unstable_settings = { initialRouteName: "index" };

export default function WorkoutLayout() {
  return (
    <IosModalSafeArea>
      <Column>
        <Stack screenOptions={useStackScreenOptions()}>
          <Stack.Screen
            name="index"
            options={{
              title: "Workout",
              headerTitleAlign: "center",
              headerBackVisible: false,
              headerLeft: () => <LeaveButton />,
            }}
          />
          <Stack.Screen name="add-exercise" options={{ title: "Add exercise", presentation: "modal" }} />
          <Stack.Screen name="finish" options={{ title: "Finish workout" }} />
        </Stack>
      </Column>
    </IosModalSafeArea>
  );
}

// Leaves the Workout running and goes back to the tabs, where the Resume pill brings it back
function LeaveButton() {
  const leaveWorkout = useLeaveWorkout();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Leave workout"
      onPress={leaveWorkout}
      style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
    >
      <Icon name="chevronDown" color="text" size={26} />
    </Pressable>
  );
}
