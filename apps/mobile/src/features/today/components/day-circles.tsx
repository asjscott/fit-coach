import type { TrainingDay } from "@fit/engines";
import { StyleSheet, View } from "react-native";
import { Icon } from "@/components/icons";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";

const SIZE = 38;

const weekday = (date: Date, style: "narrow" | "long") => date.toLocaleDateString([], { weekday: style });

// Monday to Sunday: a tick on the days trained, a dashed accent ring around today
export function DayCircles({ days }: { days: TrainingDay[] }) {
  const { colors } = useTheme();
  const trained = days.filter((day) => day.trained).map((day) => weekday(day.date, "long"));

  return (
    <View
      accessible
      accessibilityLabel={trained.length ? `Trained ${trained.join(", ")}` : "No training days yet this week"}
      style={styles.row}
    >
      {days.map((day) => (
        <View key={day.date.getTime()} style={styles.day}>
          <View
            style={[
              styles.circle,
              day.trained ? { backgroundColor: colors.accent } : { backgroundColor: colors.raised },
              day.isToday && !day.trained && { borderWidth: 2, borderStyle: "dashed", borderColor: colors.accent },
            ]}
          >
            {day.trained ? <Icon name="check" size={18} strokeWidth={3} color="onAccent" /> : null}
          </View>
          <Text size="xs" weight={day.isToday ? "bold" : "medium"} color={day.isToday ? "text" : "muted"}>
            {weekday(day.date, "narrow")}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between" },
  day: { alignItems: "center", gap: spacing[1] + 2 },
  circle: { width: SIZE, height: SIZE, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
});
