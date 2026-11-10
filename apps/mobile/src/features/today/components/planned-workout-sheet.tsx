import type { DayExercise } from "@fit/engines";
import type { BuiltInEquipment, CheckIn, DayLength } from "@fit/shared";
import { type ReactNode, useRef } from "react";
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
import {
  checkInLighterRow,
  LIGHTER_AFTER_CHECK_IN,
  RECOVERY_INSTEAD,
  SUPERSETS_TO_FIT,
  supersetWithLabel,
  todayPlanLine,
} from "../today-status";
import { CheckInRatings } from "./check-in-card";
import { TodayCardLink } from "./today-card";

type SheetCheckIn = {
  ratings: CheckIn;
  onChange: (checkIn: CheckIn) => void;
  // Whether it took Sets off, whether some rating would, and whether the user chose the Full workout anyway
  lighter: boolean;
  canBeLighter: boolean;
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
  // The Recovery Workout, on offer every day in place of this one
  onStartRecovery: () => void;
};

// The Day's Workout in full, with the choices that shape it
export function PlannedWorkoutSheet({
  isOpen,
  onClose,
  cue,
  reasons,
  plannedExercises,
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
  onStartRecovery,
}: PlannedWorkoutSheetProps) {
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
              <Text size="sm" color="muted">
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
            {supersets.paired || supersets.off ? (
              // Like Full workout: offered only once it would change something, and kept while chosen
              <View style={{ gap: spacing[2] }}>
                {supersets.paired ? (
                  <Text size="sm" color="muted">
                    {SUPERSETS_TO_FIT}
                  </Text>
                ) : null}
                <HStack spacing={2}>
                  <Chip
                    label="No supersets"
                    selected={supersets.off}
                    onPress={() => supersets.onChooseOff(!supersets.off)}
                  />
                </HStack>
              </View>
            ) : null}
            {checkIn ? (
              <View style={{ gap: spacing[2] }}>
                {lighterRow?.reserved ? (
                  <>
                    <Reserved hidden={!lighterRow.note}>
                      <Text size="sm" color="muted">
                        {LIGHTER_AFTER_CHECK_IN}
                      </Text>
                    </Reserved>
                    <Reserved hidden={!lighterRow.chip}>
                      <HStack spacing={2}>
                        <Chip
                          label="Full workout"
                          selected={checkIn.fullWorkout}
                          onPress={() => checkIn.onChooseFullWorkout(!checkIn.fullWorkout)}
                        />
                      </HStack>
                    </Reserved>
                  </>
                ) : null}
                <CheckInRatings
                  ratings={checkIn.ratings}
                  onRate={(key, rating) => checkIn.onChange({ ...checkIn.ratings, [key]: rating })}
                />
              </View>
            ) : null}
            <View>
              {plannedExercises.map(({ slug, sets, target, replaces, otherOptions, supersetWith }) => (
                <View key={slug} style={[styles.exercise, { borderTopColor: colors.line }]}>
                  <Text>{exerciseName(slug)}</Text>
                  <Text size="sm" color="muted">
                    {plannedSetsLabel({ sets, target }, libraryExercise(slug)?.unilateral)}
                  </Text>
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
            <TodayCardLink label={RECOVERY_INSTEAD} color="text" size="sm" onPress={startOnceClosed(onStartRecovery)} />
          </View>
        </View>
      </ActionsheetContent>
    </Actionsheet>
  );
}

// Hidden, it keeps its space, but can't be seen, tapped or read out
function Reserved({ hidden, children }: { hidden: boolean; children: ReactNode }) {
  return (
    <View
      style={hidden ? styles.hidden : null}
      pointerEvents={hidden ? "none" : "auto"}
      aria-hidden={hidden}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  scroll: { width: "100%" },
  content: { gap: spacing[3], paddingBottom: spacing[3] },
  // Outside the scroll, so Start is in reach however long the list is
  start: { width: "100%", paddingTop: spacing[3] },
  recovery: { alignItems: "center", paddingTop: spacing[3] },
  exercise: { paddingVertical: spacing[2], gap: 2, borderTopWidth: StyleSheet.hairlineWidth },
});
