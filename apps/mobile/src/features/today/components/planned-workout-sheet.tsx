import type { DayExercise } from "@fit/engines";
import type { BuiltInEquipment, CheckIn, DayLength } from "@fit/shared";
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
import { exerciseName, targetReading } from "@/features/workouts/library";
import { spacing, useTheme } from "@/theme";
import {
  checkInLighterRow,
  LIGHTER_AFTER_CHECK_IN,
  SUPERSETS_TO_FIT,
  supersetWithLabel,
  todayPlanLine,
} from "../today-status";
import { progressionChangeLine } from "../plan-reasons";
import { CheckInRatings } from "./check-in-card";
import { RecoveryLinks } from "./recovery-links";
import { useWeightUnit } from "@/features/user/current-user-provider";

type SheetCheckIn = {
  ratings: CheckIn;
  onChange: (checkIn: CheckIn) => void;
  // Whether it took Sets off, and whether the user chose the Full workout anyway
  lighter: boolean;
  fullWorkout: boolean;
  onChooseFullWorkout: (fullWorkout: boolean) => void;
};

type SheetSupersets = {
  // Whether the Workout pairs any Exercises, and whether the user turned that off for this Workout
  paired: boolean;
  off: boolean;
  onChooseOff: (off: boolean) => void;
};

type PlannedWorkoutSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  cue?: string;
  // Why the Coach planned it, worded, in the order to show
  reasons: string[];
  plannedExercises: DayExercise[];
  // Built for the deload week, so its targets are one number
  deloadWeek?: boolean;
  estimatedSeconds: number;
  dropped: string[];
  workoutLength: DayLength;
  onChooseLength: (workoutLength: DayLength) => void;
  equipment: BuiltInEquipment | undefined;
  equipmentChoices: BuiltInEquipment[];
  onChooseEquipment: (equipment?: BuiltInEquipment) => void;
  onPickAlternative: (replaces: string, slug: string) => void;
  supersets: SheetSupersets;
  // Today's check-in and what it did to the Workout, null before the user checks in
  checkIn: SheetCheckIn | null;
  onStart: () => void;
  // The Recovery Workouts, on offer every day in place of this one
  onMobility: () => void;
  onWalkAndMobility: () => void;
};

// The Day's Workout in full, with the choices that shape it
export function PlannedWorkoutSheet({
  isOpen,
  onClose,
  cue,
  reasons,
  plannedExercises,
  deloadWeek,
  estimatedSeconds,
  dropped,
  workoutLength,
  onChooseLength,
  equipment,
  equipmentChoices,
  onChooseEquipment,
  onPickAlternative,
  supersets,
  checkIn,
  onStart,
  onMobility,
  onWalkAndMobility,
}: PlannedWorkoutSheetProps) {
  const unit = useWeightUnit();
  const { colors } = useTheme();
  // iOS can't present the Workout until the sheet has gone
  const startOnClosed = useRef<(() => void) | null>(null);
  const startOnceClosed = (startWorkout: () => void) => () => {
    startOnClosed.current = startWorkout;
    onClose();
  };
  const handleClosed = () => {
    startOnClosed.current?.();
    startOnClosed.current = null;
  };
  const lighterRow = checkIn && checkInLighterRow(checkIn);

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
              {/* One line however the counts change, so nothing below it moves as you rate (#147) */}
              <Text size="sm" color="muted" numberOfLines={1}>
                {todayPlanLine(plannedExercises, estimatedSeconds)}
              </Text>
              {reasons.map((reason) => (
                <Text key={reason} size="sm" color="muted">
                  {reason}
                </Text>
              ))}
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
              <CheckInRatings
                ratings={checkIn.ratings}
                onRate={(key, rating) => checkIn.onChange({ ...checkIn.ratings, [key]: rating })}
              />
            ) : null}
            {/* What the check-in changes comes and goes as you rate, so it sits below the ratings, where it moves
                nothing above them. Its note goes when Full workout is chosen, so it sits below the chip, which stays
                put under your finger (#147) */}
            {checkIn && lighterRow?.shown ? (
              <View style={{ gap: spacing[2] }}>
                <HStack spacing={2}>
                  <Chip
                    label="Full workout"
                    selected={checkIn.fullWorkout}
                    onPress={() => checkIn.onChooseFullWorkout(!checkIn.fullWorkout)}
                  />
                </HStack>
                {lighterRow.note ? (
                  <Text size="sm" color="muted">
                    {LIGHTER_AFTER_CHECK_IN}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {supersets.paired || supersets.off ? (
              // Like Full workout: offered only once it would change something, and kept while chosen. Its note goes
              // when No supersets is chosen, so it sits below the chip, which stays put under your finger (#147)
              <View style={{ gap: spacing[2] }}>
                <HStack spacing={2}>
                  <Chip
                    label="No supersets"
                    selected={supersets.off}
                    onPress={() => supersets.onChooseOff(!supersets.off)}
                  />
                </HStack>
                {supersets.paired ? (
                  <Text size="sm" color="muted">
                    {SUPERSETS_TO_FIT}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <View>
              {plannedExercises.map(({ slug, sets, target, replaces, otherOptions, supersetWith, change }) => (
                <View key={slug} style={[styles.exercise, { borderTopColor: colors.line }]}>
                  <Text>{exerciseName(slug)}</Text>
                  <Text size="sm" color="muted">
                    {plannedSetsLabel({ sets, target }, unit, targetReading(slug, deloadWeek))}
                  </Text>
                  {progressionChangeLine(change, slug) ? (
                    <Text size="sm" color="muted">
                      {progressionChangeLine(change, slug)}
                    </Text>
                  ) : null}
                  {supersetWith ? (
                    <Text size="sm" color="muted">
                      {supersetWithLabel(exerciseName(supersetWith))}
                    </Text>
                  ) : null}
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
            onPress={startOnceClosed(onStart)}
          />
          <View style={styles.recovery}>
            <RecoveryLinks
              color="text"
              size="sm"
              onMobility={startOnceClosed(onMobility)}
              onWalkAndMobility={startOnceClosed(onWalkAndMobility)}
            />
          </View>
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
  recovery: { alignItems: "center", gap: spacing[3], paddingTop: spacing[3] },
  exercise: { paddingVertical: spacing[2], gap: 2, borderTopWidth: StyleSheet.hairlineWidth },
});
