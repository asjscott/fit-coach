import type { PlannedWorkout } from "@fit/shared";
import { View } from "react-native";
import { LoadingButton } from "@/components/loading-button";
import { SectionLabel } from "@/components/section-label";
import { Text } from "@/components/text";
import { plannedSetsLabel } from "@/features/workouts/format";
import { exerciseName, libraryExercise } from "@/features/workouts/library";
import { spacing } from "@/theme";

type PlannedWorkoutSectionProps = {
  plannedWorkout: PlannedWorkout;
  startingPlan: boolean;
  startingManual: boolean;
  onStart: () => void;
  onStartManual: () => void;
};

// Today's Planned Workout: its Exercises in order, each with its Set count and target, and Start, with a Manual
// Workout as the smaller choice below
export function PlannedWorkoutSection({
  plannedWorkout,
  startingPlan,
  startingManual,
  onStart,
  onStartManual,
}: PlannedWorkoutSectionProps) {
  const starting = startingPlan || startingManual;
  return (
    <View style={{ gap: spacing[3] }}>
      <View style={{ gap: spacing[2] }}>
        <SectionLabel>Planned Workout</SectionLabel>
        {plannedWorkout.plannedExercises.map(({ slug, sets, target }) => (
          <View key={slug}>
            <Text>{exerciseName(slug)}</Text>
            <Text size="sm" color="muted">
              {plannedSetsLabel({ sets, target }, libraryExercise(slug)?.unilateral)}
            </Text>
          </View>
        ))}
      </View>
      <LoadingButton
        label="Start workout"
        icon="dumbbell"
        fullWidth
        loading={startingPlan}
        disabled={starting}
        onPress={onStart}
      />
      <LoadingButton
        label="Start manual workout"
        size="md"
        action="secondary"
        fullWidth
        loading={startingManual}
        disabled={starting}
        onPress={onStartManual}
      />
    </View>
  );
}
