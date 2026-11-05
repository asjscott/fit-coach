import type { InProgressWorkoutExercise } from "@fit/shared";
import { StyleSheet, View } from "react-native";
import { Icon } from "@/components/icons";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { fonts, spacing, useTheme } from "@/theme";
import { workoutExerciseSummary } from "../format";
import { exerciseName } from "../library";
import { WorkoutExerciseMenu } from "./workout-exercise-menu";

export type WorkoutExerciseRowProps = {
  workoutExercise: InProgressWorkoutExercise;
  // Its place in the Workout, from 0
  position: number;
  // Makes it the current Workout Exercise
  onPress: () => void;
};

// A Workout Exercise that isn't current, collapsed to one row: a tick once it has Sets (else its number), its
// name and a one-line summary of its Sets (its target or Previous Sets before any), and its ⋯ menu. Pressing the row makes it current
export function WorkoutExerciseRow({ workoutExercise, position, onPress }: WorkoutExerciseRowProps) {
  const { colors } = useTheme();
  const name = exerciseName(workoutExercise.slug);
  const { sets, previousSets, planned } = workoutExercise;
  const summary = workoutExerciseSummary(sets, previousSets?.sets, planned);
  const done = sets.length > 0;

  return (
    <View style={[styles.row, { borderTopColor: colors.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${summary}`}
        accessibilityHint="Makes it the current Exercise"
        onPress={onPress}
        style={styles.main}
      >
        <View
          style={[
            styles.dot,
            done ? { backgroundColor: colors.accent, borderColor: colors.accent } : { borderColor: colors.inputBorder },
          ]}
        >
          {done ? (
            <Icon name="check" rawColor={colors.onAccent} size={14} />
          ) : (
            <Text size="xs" color="muted" weight="semiBold">
              {position + 1}
            </Text>
          )}
        </View>
        <View style={styles.text}>
          <Text isTruncated style={styles.name}>
            {name}
          </Text>
          <Text size="sm" color="muted" isTruncated>
            {summary}
          </Text>
        </View>
      </Pressable>
      <WorkoutExerciseMenu workoutExercise={workoutExercise} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", minHeight: 64, borderTopWidth: StyleSheet.hairlineWidth },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing[3], alignSelf: "stretch" },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, paddingVertical: spacing[2] },
  name: { fontFamily: fonts.semiBold },
});
