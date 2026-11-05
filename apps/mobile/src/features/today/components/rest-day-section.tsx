import type { RestDayReason } from "@fit/engines";
import { View } from "react-native";
import { Text } from "@/components/text";
import { spacing } from "@/theme";

const WHY: Record<RestDayReason, string> = {
  "days-per-week-reached": "You've reached your days per week.",
  "trained-today": "You've trained today.",
  "trained-yesterday": "You trained yesterday, and this week's Workouts still fit.",
};

// Advice only: Start stays available
export function RestDaySection({ reason }: { reason: RestDayReason }) {
  return (
    <View style={{ gap: spacing[1] }}>
      <Text weight="semiBold">Rest Day recommended</Text>
      <Text size="sm" color="muted">
        {WHY[reason]} You can still train if you want to.
      </Text>
    </View>
  );
}
