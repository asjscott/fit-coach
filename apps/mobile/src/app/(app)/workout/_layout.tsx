import { Stack } from "expo-router";
import { Column } from "@/components/column";
import { Icon } from "@/components/icons";
import { Pressable } from "@/components/pressable";
import { useLeaveWorkout } from "@/features/workouts/hooks/use-leave-workout";
import { useStackScreenOptions } from "@/hooks/use-stack-screen-options";

// Finish and the picker opened by a link still have the Workout under them
export const unstable_settings = { initialRouteName: "index" };

export default function WorkoutLayout() {
  return (
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
