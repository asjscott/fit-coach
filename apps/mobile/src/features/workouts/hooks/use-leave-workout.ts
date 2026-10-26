import { useNavigation } from "expo-router";

// The Workout screens are one Stack presented over the tabs: leaving closes all of it, back to the tab
// the user came from
export function useLeaveWorkout() {
  const navigation = useNavigation();
  return () => navigation.getParent()?.goBack();
}
