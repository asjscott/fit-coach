import type { DayExercise } from "@fit/engines";
import type { BuiltInEquipment, WorkoutLength } from "@fit/shared";
import { View } from "react-native";
import { Chip } from "@/components/chip";
import { LoadingButton } from "@/components/loading-button";
import { SectionLabel } from "@/components/section-label";
import { HStack } from "@/components/stack";
import { Text } from "@/components/text";
import { workoutLengthOptions } from "@/features/user/components/form/fields/user-workout-length-field";
import { estimatedTimeLabel, noAlternativeLabel, plannedSetsLabel } from "@/features/workouts/format";
import { exerciseName, libraryExercise } from "@/features/workouts/library";
import { spacing } from "@/theme";

const EQUIPMENT_LABELS: Record<BuiltInEquipment, string> = { full_gym: "Full gym", bodyweight_only: "Bodyweight only" };

type PlannedWorkoutSectionProps = {
  plannedExercises: DayExercise[];
  estimatedSeconds: number;
  dropped: string[];
  workoutLength: WorkoutLength;
  onChooseLength: (workoutLength: WorkoutLength) => void;
  equipment: BuiltInEquipment | undefined;
  equipmentChoices: BuiltInEquipment[];
  onChooseEquipment: (equipment?: BuiltInEquipment) => void;
  onPickAlternative: (replaces: string, slug: string) => void;
  startingPlan: boolean;
  startingManual: boolean;
  onStart: () => void;
  onStartManual: () => void;
};

// Today's Planned Workout, cut to the Workout Length: its Exercises in order, each with its Set count and target, its
// estimated time, the Length and equipment to change for this Workout, what replaced or dropped out on that equipment,
// and Start, with a Manual Workout as the smaller choice below
export function PlannedWorkoutSection({
  plannedExercises,
  estimatedSeconds,
  dropped,
  workoutLength,
  onChooseLength,
  equipment,
  equipmentChoices,
  onChooseEquipment,
  onPickAlternative,
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
        {equipmentChoices.length ? (
          <HStack spacing={2} wrap="wrap">
            <Chip
              label="Usual equipment"
              selected={!equipment}
              disabled={starting}
              onPress={() => onChooseEquipment()}
            />
            {equipmentChoices.map((choice) => (
              <Chip
                key={choice}
                label={EQUIPMENT_LABELS[choice]}
                selected={choice === equipment}
                disabled={starting}
                onPress={() => onChooseEquipment(choice)}
              />
            ))}
          </HStack>
        ) : null}
        {plannedExercises.map(({ slug, sets, target, replaces, otherOptions }) => (
          <View key={slug} style={{ gap: spacing[1] }}>
            <View>
              <Text>{exerciseName(slug)}</Text>
              <Text size="sm" color="muted">
                {plannedSetsLabel({ sets, target }, libraryExercise(slug)?.unilateral)}
              </Text>
              {replaces ? (
                <Text size="sm" color="muted">
                  {`Instead of ${exerciseName(replaces)}`}
                </Text>
              ) : null}
            </View>
            {replaces && otherOptions?.length ? (
              <HStack spacing={2} wrap="wrap">
                {otherOptions.map((option) => (
                  <Chip
                    key={option.slug}
                    label={exerciseName(option.slug)}
                    disabled={starting}
                    onPress={() => onPickAlternative(replaces, option.slug)}
                  />
                ))}
              </HStack>
            ) : null}
          </View>
        ))}
        {equipment
          ? dropped.map((slug) => (
              <Text key={slug} size="sm" color="muted">
                {noAlternativeLabel(equipment, exerciseName(slug))}
              </Text>
            ))
          : null}
      </View>
      <LoadingButton
        label="Start workout"
        icon="dumbbell"
        fullWidth
        loading={startingPlan}
        disabled={starting || !plannedExercises.length}
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
