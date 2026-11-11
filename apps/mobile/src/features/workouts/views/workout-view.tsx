import { setCount, supersetGroups, workoutVolume } from "@fit/engines";
import type { InProgressWorkout } from "@fit/shared";
import { Stack as NavStack, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ConfirmModal } from "@/components/choice-modal";
import { Icon } from "@/components/icons";
import { KeyboardAwareScrollView } from "@/components/keyboard-aware-scroll-view";
import { LoadingButton } from "@/components/loading-button";
import { OverflowMenu } from "@/components/overflow-menu";
import { Pressable } from "@/components/pressable";
import { Screen } from "@/components/screen";
import { Stack } from "@/components/stack";
import { Stat } from "@/components/stat";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { usePrimaryEquipmentProfile, useWeightUnit } from "@/features/user/current-user-provider";
import { useNow } from "@/hooks/use-now";
import { fonts, spacing, useTheme } from "@/theme";
import { errorMessage } from "@/utils/error-message";
import { CurrentExerciseBox } from "../components/current-exercise-box";
import { SupersetBox } from "../components/superset-box";
import { WorkoutExerciseRow } from "../components/workout-exercise-row";
import { nextPlannedExercise, useCurrentWorkoutExercise } from "../current-workout-exercise";
import { elapsedClockLabel, supersetLetter, timeLabel, volumeLabel } from "../format";
import { useHasEnded } from "../hooks/use-has-ended";
import { useLeaveWorkout } from "../hooks/use-leave-workout";
import { useStartWorkout } from "../hooks/use-open-workout";
import { useLogbook } from "../logbook-provider";

// The In-progress Workout, laid out for logging between sets: Elapsed, Sets and Volume at the top, the current
// Workout Exercise open in a box and the others collapsed to rows, Add exercise, and Finish alone at the bottom.
// Discard workout sits in the header's ⋯ menu
export default function WorkoutView() {
  const { workout } = useLogbook();
  const hasEnded = useHasEnded(workout);

  // Finished or discarded: blank until the navigation away lands
  if (hasEnded) return <Screen edges={["bottom"]}>{null}</Screen>;
  if (!workout) return <NoWorkout />;
  return <InProgress workout={workout} />;
}

function InProgress({ workout }: { workout: InProgressWorkout }) {
  const { colors } = useTheme();
  const { discard, testProgress } = useLogbook();
  const primaryEquipment = usePrimaryEquipmentProfile();
  const { showToast } = useToast();
  const leaveWorkout = useLeaveWorkout();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const { workoutExercises } = workout;
  const tests = workout.assessment && primaryEquipment ? testProgress(workout, primaryEquipment) : undefined;
  const nextPlanned = nextPlannedExercise(workoutExercises);
  const [currentId, choose] = useCurrentWorkoutExercise(
    workoutExercises.map((we) => we.id),
    tests?.nextTestId ?? nextPlanned,
  );
  // What the current Exercise offers once it takes no more Sets: an Assessment Workout's next test, else the next
  // planned Exercise
  const nextId = tests ? tests.nextTestId : nextPlanned;
  const next = nextId ? { label: tests ? "Next test" : "Next exercise", onPress: () => choose(nextId) } : undefined;
  const groups = supersetGroups(workoutExercises);
  const pairs = groups.filter((group) => group.length === 2);

  return (
    <Screen padded={false} scroll="content" edges={["bottom"]}>
      <NavStack.Screen
        options={{
          headerTitle: () => (
            <WorkoutTitle
              title={workout.assessment ? `Assessment ${workout.assessment}` : "Workout"}
              startedAt={workout.startedAt}
            />
          ),
          headerRight: () => (
            <OverflowMenu
              label="Workout actions"
              items={[{ label: "Discard workout", destructive: true, onPress: () => setConfirmingDiscard(true) }]}
            />
          ),
        }}
      />
      <KeyboardAwareScrollView contentContainerStyle={styles.content}>
        <WorkoutStats workout={workout} />
        <View>
          {workoutExercises.length === 0 ? (
            <Text color="muted" style={styles.empty}>
              Add an Exercise to start logging Sets.
            </Text>
          ) : null}
          {groups.map((group) => {
            const [workoutExercise, partner] = group;
            if (!workoutExercise) return null;
            if (partner) {
              const letter = supersetLetter(pairs.indexOf(group));
              const pair = [workoutExercise, partner] as const;
              return pair.some(({ id }) => id === currentId) ? (
                <View key={workoutExercise.id} style={styles.current}>
                  <SupersetBox pair={pair} letter={letter} currentId={currentId ?? ""} onChoose={choose} />
                </View>
              ) : (
                <View key={workoutExercise.id} style={[styles.pairRows, { borderLeftColor: colors.accent }]}>
                  {pair.map((member) => (
                    <WorkoutExerciseRow
                      key={member.id}
                      workoutExercise={member}
                      position={workoutExercises.indexOf(member)}
                      onPress={() => choose(member.id)}
                    />
                  ))}
                </View>
              );
            }
            const i = workoutExercises.indexOf(workoutExercise);
            return workoutExercise.id === currentId ? (
              <View key={workoutExercise.id} style={styles.current}>
                <CurrentExerciseBox
                  workoutExercise={workoutExercise}
                  position={i}
                  count={workoutExercises.length}
                  next={next}
                />
              </View>
            ) : (
              <WorkoutExerciseRow
                key={workoutExercise.id}
                workoutExercise={workoutExercise}
                position={i}
                onPress={() => choose(workoutExercise.id)}
              />
            );
          })}
        </View>
        {/* An Assessment Workout's tests are fixed */}
        {workout.assessment ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add exercise"
            onPress={() => router.push("/workout/add-exercise")}
            style={[styles.addRow, { borderColor: colors.line }]}
          >
            <Icon name="plus" color="accent" size={22} />
            <Text color="accent" style={styles.addLabel}>
              Add exercise
            </Text>
          </Pressable>
        )}
      </KeyboardAwareScrollView>
      <View style={[styles.footer, { borderTopColor: colors.line, backgroundColor: colors.bg }]}>
        {/* Finish is the main button once every test is done; finishing early stays possible (untested Patterns) */}
        <LoadingButton
          label="Finish"
          action={tests?.allDone ? "primary" : "secondary"}
          href="/workout/finish"
          fullWidth
        />
      </View>
      <ConfirmModal
        isOpen={confirmingDiscard}
        title="Discard Workout?"
        message="Everything you've logged in this Workout will be deleted. This can't be undone."
        confirmLabel="Discard"
        onCancel={() => setConfirmingDiscard(false)}
        onConfirm={async () => {
          try {
            await discard();
            setConfirmingDiscard(false);
            leaveWorkout();
          } catch (err) {
            showToast(`Couldn't discard: ${errorMessage(err)}`, { error: err });
          }
        }}
      />
    </Screen>
  );
}

// "Workout" (or "Assessment A") over its start time, in the header
function WorkoutTitle({ title, startedAt }: { title: string; startedAt: string }) {
  return (
    <View style={styles.title}>
      <Text accessibilityRole="header" style={styles.titleText}>
        {title}
      </Text>
      <Text size="xs" color="muted">
        Started {timeLabel(startedAt)}
      </Text>
    </View>
  );
}

// Elapsed (ticking), Sets and Volume so far
function WorkoutStats({ workout }: { workout: InProgressWorkout }) {
  const unit = useWeightUnit();
  const now = useNow();
  return (
    <View style={styles.stats}>
      <Stat size="3xl" value={elapsedClockLabel(now - Date.parse(workout.startedAt))} label="Elapsed" />
      <Stat size="3xl" value={String(setCount(workout))} label="Sets" />
      <Stat size="3xl" value={volumeLabel(workoutVolume(workout), unit)} unit={unit} label="Volume" />
    </View>
  );
}

// Reached with no Workout in progress, e.g. by reloading on web after finishing
function NoWorkout() {
  const { startWorkout, starting } = useStartWorkout();
  return (
    <Screen edges={["bottom"]}>
      <Stack spacing={4}>
        <Text color="muted">No Workout in progress.</Text>
        <LoadingButton label="Start workout" icon="plus" loading={starting} onPress={startWorkout} />
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[5], paddingBottom: spacing[8] },
  title: { alignItems: "center" },
  titleText: { fontFamily: fonts.semiBold },
  stats: { flexDirection: "row", gap: spacing[3], marginBottom: spacing[5] },
  empty: { paddingVertical: spacing[4] },
  current: { marginVertical: spacing[3] },
  // A superset that isn't current: its two rows, marked as a pair
  pairRows: { borderLeftWidth: 3, paddingLeft: spacing[2] },
  addRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addLabel: { fontFamily: fonts.semiBold },
  footer: { paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderTopWidth: StyleSheet.hairlineWidth },
});
