import type { CheckIn, DayExercise } from "@fit/engines";
import type { BuiltInEquipment, DayLength } from "@fit/shared";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetScrollView,
} from "@/components/actionsheet";
import { Chip } from "@/components/chip";
import { Heading } from "@/components/heading";
import { LoadingButton } from "@/components/loading-button";
import { HStack } from "@/components/stack";
import { Text } from "@/components/text";
import { dayLengthOptions } from "@/features/user/components/form/fields/user-workout-length-field";
import { builtInEquipmentLabels, noAlternativeLabel, plannedSetsLabel } from "@/features/workouts/format";
import { exerciseName, libraryExercise } from "@/features/workouts/library";
import { spacing, useTheme } from "@/theme";
import { todayPlanLine } from "../today-status";
import { CheckInRatings } from "./check-in-card";

type PlannedWorkoutSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  cue?: string;
  plannedExercises: DayExercise[];
  estimatedSeconds: number;
  dropped: string[];
  workoutLength: DayLength;
  onChooseLength: (workoutLength: DayLength) => void;
  equipment: BuiltInEquipment | undefined;
  equipmentChoices: BuiltInEquipment[];
  onChooseEquipment: (equipment?: BuiltInEquipment) => void;
  onPickAlternative: (replaces: string, slug: string) => void;
  checkIn: CheckIn | null;
  onCheckIn: (checkIn: CheckIn) => void;
  lighter: boolean;
  fullWorkout: boolean;
  onChooseFullWorkout: (fullWorkout: boolean) => void;
  onStart: () => void;
};

// The Day's Workout in full, with the choices that shape it
export function PlannedWorkoutSheet({
  isOpen,
  onClose,
  cue,
  plannedExercises,
  estimatedSeconds,
  dropped,
  workoutLength,
  onChooseLength,
  equipment,
  equipmentChoices,
  onChooseEquipment,
  onPickAlternative,
  checkIn,
  onCheckIn,
  lighter,
  fullWorkout,
  onChooseFullWorkout,
  onStart,
}: PlannedWorkoutSheetProps) {
  const { colors } = useTheme();
  // iOS can't present the Workout until the sheet has gone
  const startOnClosed = useRef(false);
  const start = () => {
    startOnClosed.current = true;
    onClose();
  };
  const handleClosed = () => {
    if (startOnClosed.current) onStart();
    startOnClosed.current = false;
  };

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose} onClosed={handleClosed}>
      <ActionsheetBackdrop />
      <ActionsheetContent>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>
        <ActionsheetScrollView style={styles.scroll}>
          <View style={styles.content}>
            <View style={{ gap: spacing[1] }}>
              <Heading size="lg">Next Workout</Heading>
              <Text size="sm" color="muted">
                {todayPlanLine(plannedExercises, estimatedSeconds)}
              </Text>
              {cue ? (
                <Text size="sm" color="muted">
                  {cue}
                </Text>
              ) : null}
            </View>
            <HStack spacing={2} wrap="wrap">
              {dayLengthOptions.map(({ value, label }) => (
                <Chip
                  key={value}
                  label={label}
                  selected={value === workoutLength}
                  onPress={() => onChooseLength(value)}
                />
              ))}
            </HStack>
            {equipmentChoices.length ? (
              <HStack spacing={2} wrap="wrap">
                <Chip label="Usual equipment" selected={!equipment} onPress={() => onChooseEquipment()} />
                {equipmentChoices.map((choice) => (
                  <Chip
                    key={choice}
                    label={builtInEquipmentLabels[choice]}
                    selected={choice === equipment}
                    onPress={() => onChooseEquipment(choice)}
                  />
                ))}
              </HStack>
            ) : null}
            {checkIn ? (
              <View style={{ gap: spacing[2] }}>
                {lighter ? (
                  <Text size="sm" color="muted">
                    Lighter after your check-in
                  </Text>
                ) : null}
                {lighter || fullWorkout ? (
                  <HStack spacing={2}>
                    <Chip
                      label="Full Workout"
                      selected={fullWorkout}
                      onPress={() => onChooseFullWorkout(!fullWorkout)}
                    />
                  </HStack>
                ) : null}
                <CheckInRatings ratings={checkIn} onRate={(key, rating) => onCheckIn({ ...checkIn, [key]: rating })} />
              </View>
            ) : null}
            <View>
              {plannedExercises.map(({ slug, sets, target, replaces, otherOptions }) => (
                <View key={slug} style={[styles.exercise, { borderTopColor: colors.line }]}>
                  <Text>{exerciseName(slug)}</Text>
                  <Text size="sm" color="muted">
                    {plannedSetsLabel({ sets, target }, libraryExercise(slug)?.unilateral)}
                  </Text>
                  {replaces ? (
                    <Text size="sm" color="muted">
                      {`Instead of ${exerciseName(replaces)}`}
                    </Text>
                  ) : null}
                  {replaces && otherOptions?.length ? (
                    <HStack spacing={2} wrap="wrap" style={{ marginTop: spacing[1] }}>
                      {otherOptions.map((option) => (
                        <Chip
                          key={option.slug}
                          label={exerciseName(option.slug)}
                          onPress={() => onPickAlternative(replaces, option.slug)}
                        />
                      ))}
                    </HStack>
                  ) : null}
                </View>
              ))}
            </View>
            {equipment
              ? dropped.map((slug) => (
                  <Text key={slug} size="sm" color="muted">
                    {noAlternativeLabel(equipment, exerciseName(slug))}
                  </Text>
                ))
              : null}
          </View>
        </ActionsheetScrollView>
        <View style={styles.start}>
          <LoadingButton
            label="Start workout"
            icon="dumbbell"
            fullWidth
            disabled={!plannedExercises.length}
            onPress={start}
          />
        </View>
      </ActionsheetContent>
    </Actionsheet>
  );
}

const styles = StyleSheet.create({
  scroll: { width: "100%" },
  content: { gap: spacing[3], paddingBottom: spacing[3] },
  // Outside the scroll, so Start is in reach however long the list is
  start: { width: "100%", paddingTop: spacing[3] },
  exercise: { paddingVertical: spacing[2], gap: 2, borderTopWidth: StyleSheet.hairlineWidth },
});
