import type { WeekSummary } from "@fit/shared";
import { StyleSheet, View } from "react-native";
import { Pressable } from "@/components/pressable";
import { Ring } from "@/components/ring";
import { Text } from "@/components/text";
import { weekDatesLabel } from "@/features/workouts/format";
import { radii, spacing, useTheme } from "@/theme";
import { weekSummaryBars, type WeekSummaryBar } from "../week-summary-card";

function Bar({ label, value, fill, tone }: WeekSummaryBar) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 4 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.between}>
        <Text size="sm" weight="semiBold">
          {label}
        </Text>
        <Text size="sm" color="muted">
          {value}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.raised }]}>
        <View style={[styles.track, { width: `${fill * 100}%`, backgroundColor: colors[tone] }]} />
      </View>
    </View>
  );
}

// The Week Summary card (prototype variant C): a ring for Workouts done against planned and the Weekly Streak, then
// a bar for each part the week has data for. A tap opens the Week Summary screen
export function WeekSummaryCard({ summary, now, onPress }: { summary: WeekSummary; now: Date; onPress: () => void }) {
  const { colors } = useTheme();
  const { workouts, streak } = summary;
  const dates = weekDatesLabel(new Date(`${summary.monday}T00:00:00`), now);
  const streakLabel = streak ? ` · 🔥 ${streak}-week streak` : "";

  return (
    <Pressable
      testID="week-summary-card"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Opens the Week Summary"
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
    >
      <View style={styles.header}>
        <Ring
          done={workouts.done}
          target={workouts.planned}
          size={44}
          color={workouts.done >= workouts.planned ? "success" : "accent"}
        />
        <View style={{ flex: 1 }}>
          <Text weight="bold" accessibilityRole="header">
            {summary.partWeek ? "Your first week" : "Last week"}
          </Text>
          <Text size="sm" color="muted">{`${dates}${streakLabel}`}</Text>
        </View>
      </View>
      {weekSummaryBars(summary).map((bar) => (
        <Bar key={bar.label} {...bar} />
      ))}
      <Text size="sm" weight="semiBold" color="accent">
        See your week ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], gap: spacing[4], borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  track: { height: 6, borderRadius: 3 },
});
