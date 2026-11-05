import type { PlannedWorkout } from "@fit/shared";
import { StyleSheet, View } from "react-native";
import { SectionLabel } from "@/components/section-label";
import { Text } from "@/components/text";
import { setsLabel } from "@/features/workouts/format";
import { exerciseName } from "@/features/workouts/library";
import { spacing } from "@/theme";

// Today's Planned Workout: its Exercises in order, each with its Set count
export function PlannedWorkoutSection({ plannedWorkout }: { plannedWorkout: PlannedWorkout }) {
  return (
    <View style={{ gap: spacing[2] }}>
      <SectionLabel>Planned Workout</SectionLabel>
      {plannedWorkout.plannedExercises.map(({ slug, sets }) => (
        <View key={slug} style={styles.row}>
          <Text style={styles.name}>{exerciseName(slug)}</Text>
          <Text size="sm" color="muted">
            {setsLabel(sets)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "baseline", gap: spacing[3] },
  name: { flex: 1 },
});
