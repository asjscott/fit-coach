import { StyleSheet, View } from "react-native";
import { Text } from "@/components/text";
import { fontSizes, lineHeight, radii, spacing, useTheme } from "@/theme";
import { tomorrowCard, type DaySummaryTomorrow } from "../day-summary";
import { TodayCardLink } from "./today-card";

// The big card that leads a finished day (prototype variant C, "Tomorrow first"): what tomorrow is, why, and what to
// eat, with the next Workout a tap away in its sheet
export function TomorrowCard({
  tomorrow,
  now,
  onSeeNextWorkout,
}: {
  tomorrow: NonNullable<DaySummaryTomorrow>;
  now: Date;
  // Null when there's no Planned Workout sheet to open
  onSeeNextWorkout: (() => void) | null;
}) {
  const { colors } = useTheme();
  const { headline, reason, targets } = tomorrowCard(tomorrow);
  const weekday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toLocaleDateString([], {
    weekday: "long",
  });
  return (
    <View style={[styles.card, { backgroundColor: colors.raised }]}>
      <Text size="xs" weight="semiBold" color="muted">
        {`TOMORROW · ${weekday.toUpperCase()}`}
      </Text>
      <Text size="4xl" weight="extraBold" accessibilityRole="header" style={styles.headline}>
        {headline}
      </Text>
      {reason ? <Text>{reason}</Text> : null}
      <Text size="sm" color="muted">
        {targets}
      </Text>
      {onSeeNextWorkout ? <TodayCardLink label="See the next Workout" color="text" onPress={onSeeNextWorkout} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing[3], padding: spacing[5], borderRadius: radii.lg },
  headline: { lineHeight: lineHeight(fontSizes["4xl"], true) },
});
