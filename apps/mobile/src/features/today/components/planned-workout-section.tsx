import type { PlannedExercise, WorkoutLength } from "@fit/shared";
import { View } from "react-native";
import { Chip } from "@/components/chip";
import { LoadingButton } from "@/components/loading-button";
import { SectionLabel } from "@/components/section-label";
import { HStack } from "@/components/stack";
import { Text } from "@/components/text";
import { workoutLengthOptions } from "@/features/user/components/form/fields/user-workout-length-field";
import { estimatedTimeLabel, plannedSetsLabel } from "@/features/workouts/format";
import { exerciseName, libraryExercise } from "@/features/workouts/library";
import { spacing } from "@/theme";

type PlannedWorkoutSectionProps = {
  plannedExercises: PlannedExercise[];
  estimatedSeconds: number;
  workoutLength: WorkoutLength;
  onChooseLength: (workoutLength: WorkoutLength) => void;
  startingPlan: boolean;
  startingManual: boolean;
  onStart: () => void;
  onStartManual: () => void;
};

// Today's Planned Workout, cut to the Workout Length: its Exercises in order, each with its Set count and target, its
// estimated time, the Length to change for this Workout, and Start, with a Manual Workout as the smaller choice below
export function PlannedWorkoutSection({
  plannedExercises,
  estimatedSeconds,
  workoutLength,
  onChooseLength,
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
        <Text size="sm" color="muted">
          {estimatedTimeLabel(estimatedSeconds)}
        </Text>
        <HStack spacing={2}>
          {workoutLengthOptions.map(({ value, label }) => (
            <Chip
              key={value}
              label={label}
              selected={value === workoutLength}
              disabled={starting}
              onPress={() => onChooseLength(value)}
            />
          ))}
        </HStack>
        {plannedExercises.map(({ slug, sets, target }) => (
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
