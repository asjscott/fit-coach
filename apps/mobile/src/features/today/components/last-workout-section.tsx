import { summarizeWorkout } from "@fit/engines";
import type { Workout } from "@fit/shared";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon } from "@/components/icons";
import { SectionLabel } from "@/components/section-label";
import { Stat } from "@/components/stat";
import { Text } from "@/components/text";
import { relativeDateLabel, setsSummary, timeStat, volumeLabel } from "@/features/workouts/format";
import { exerciseName } from "@/features/workouts/library";
import { spacing, useTheme } from "@/theme";
import { useWeightUnit } from "@/features/user/current-user-provider";

const ROW_HEIGHT = 44;

// The most recent Workout: its Time, Sets and Volume, then one row per Exercise. Offline only a Pending Workout
// can be shown; without one, the section says it needs a connection
export function LastWorkoutSection({
  workout,
  isOffline,
  now,
}: {
  workout: (Workout & { isPending: boolean }) | undefined;
  isOffline: boolean;
  now: Date;
}) {
  const unit = useWeightUnit();
  const { colors } = useTheme();

  if (!workout) {
    return (
      <View style={{ gap: spacing[3] }}>
        <SectionLabel>Last workout</SectionLabel>
        <Text color="muted">
          {isOffline
            ? "Your last Workout needs a connection."
            : "Nothing yet. Your last Workout shows here once you finish one."}
        </Text>
      </View>
    );
  }

  const summary = summarizeWorkout(workout);
  const time = timeStat(summary.durationMs);
  const row = [styles.row, { borderTopColor: colors.line }];

  return (
    <View>
      <SectionLabel right={relativeDateLabel(workout.startedAt, now)} style={{ marginBottom: spacing[3] }}>
        Last workout
      </SectionLabel>
      <View style={styles.stats}>
        <Stat value={time.value} unit={time.unit} label="Time" />
        <Stat value={String(summary.sets)} label="Sets" />
        <Stat value={volumeLabel(summary.volumeKg, unit)} unit={unit} label="Volume" />
      </View>
      {workout.isPending ? (
        <Text size="xs" weight="semiBold" color="muted" style={{ marginBottom: spacing[2] }}>
          Waiting to sync
        </Text>
      ) : null}
      {workout.workoutExercises.map((exercise, i) => (
        <View key={i} style={row}>
          <Text style={{ flex: 1 }} numberOfLines={1}>
            {exerciseName(exercise.slug)}
          </Text>
          <Text color="muted" weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>
            {setsSummary(exercise.sets, unit)}
          </Text>
        </View>
      ))}
      <Pressable
        accessibilityRole="link"
        onPress={() => router.navigate("/history")}
        style={({ pressed }) => [row, pressed && { backgroundColor: colors.raised }]}
      >
        <Text weight="semiBold" color="accent" style={{ flex: 1 }}>
          See History
        </Text>
        <Icon name="chevronRight" size={18} color="accent" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", marginBottom: spacing[3] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    minHeight: ROW_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
