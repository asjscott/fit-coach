import { summarizeWorkout } from "@fit/engines";
import type { Workout, WorkoutExercise } from "@fit/shared";
import { Stack as NavStack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ConfirmModal } from "@/components/choice-modal";
import { Loading } from "@/components/loading";
import { OverflowMenu } from "@/components/overflow-menu";
import { Screen } from "@/components/screen";
import { Stack } from "@/components/stack";
import { Stat } from "@/components/stat";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { spacing, useTheme } from "@/theme";
import { errorMessage } from "@/utils/error-message";
import { SetRow } from "../components/set-row";
import { dateLabel, kgLabel, timeLabel, timeStat } from "../format";
import { useHistory } from "../history-provider";
import { exerciseName, libraryExercise } from "../library";
import { useLogbook } from "../logbook-provider";

// The detail of a Workout from History: a Pending Workout from the Logbook, deleted
// there (works offline), or an uploaded one from the list History loaded, deleted on the server
export default function WorkoutDetailView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workouts, error, isLoading, refresh, deleteWorkout } = useHistory();
  const { pending, deletePending } = useLogbook();
  // Set while a delete is under way, so the screen goes blank rather than saying the
  // Workout isn't in History in the moment between deleting and going back
  const [isDeleting, setIsDeleting] = useState(false);
  const pendingWorkout = pending.find((w) => w.id === id);
  const workout = workouts?.find((w) => w.id === id);

  // Opened directly (e.g. a web reload) before History has loaded
  useEffect(() => {
    if (!workouts) refresh();
  }, [workouts, refresh]);

  const deleting = (remove: () => Promise<void>) => async () => {
    setIsDeleting(true);
    try {
      await remove();
    } catch (err) {
      setIsDeleting(false);
      throw err;
    }
  };

  if (pendingWorkout) {
    return (
      <WorkoutDetail
        workout={pendingWorkout}
        note="Waiting to sync. It uploads when you're back online."
        onDelete={deleting(() => deletePending(pendingWorkout.id))}
      />
    );
  }
  if (workout) return <WorkoutDetail workout={workout} onDelete={deleting(() => deleteWorkout(workout.id))} />;
  if (isDeleting) return <Screen edges={["bottom"]}>{null}</Screen>;
  if (isLoading) return <Loading message="Loading Workout..." />;
  return (
    <Screen edges={["bottom"]}>
      <Text color={error ? "danger" : "muted"}>{error ?? "This Workout isn't in your History."}</Text>
    </Screen>
  );
}

type WorkoutDetailProps = {
  workout: Workout;
  // A line under the times, e.g. that a Pending Workout hasn't uploaded yet
  note?: string;
  // Deletes the Workout wherever it lives; rejects to leave it in place
  onDelete: () => Promise<void>;
};

// Titled with its date: the times, Volume, Sets and duration, then every Workout Exercise in order with its Sets.
// Delete workout sits in the header menu, behind a confirmation. Takes the Workout and how to delete it, so an
// uploaded or a Pending Workout can use it
function WorkoutDetail({ workout, note, onDelete }: WorkoutDetailProps) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const summary = summarizeWorkout(workout);

  const handleDelete = async () => {
    try {
      await onDelete();
      setConfirming(false);
      showToast("Workout deleted", { type: "success" });
      router.back();
    } catch (err) {
      setConfirming(false);
      showToast(`Couldn't delete: ${errorMessage(err)}`, { error: err });
    }
  };

  return (
    <Screen scroll edges={["bottom"]}>
      <NavStack.Screen
        options={{
          title: dateLabel(workout.startedAt),
          headerRight: () => (
            <OverflowMenu
              label="Workout actions"
              items={[{ label: "Delete workout", destructive: true, onPress: () => setConfirming(true) }]}
            />
          ),
        }}
      />
      <Stack spacing={1}>
        <Text color="muted">
          {timeLabel(workout.startedAt)} – {timeLabel(workout.endedAt)}
        </Text>
        {note !== undefined && (
          <Text size="sm" color="muted">
            {note}
          </Text>
        )}
      </Stack>
      <View style={[styles.stats, { borderColor: colors.line }]}>
        <Stat value={kgLabel(summary.volumeKg)} unit="kg" label="Volume" />
        <Stat value={String(summary.sets)} label="Sets" />
        <Stat {...timeStat(summary.durationMs)} label="Time" />
      </View>
      {workout.workoutExercises.map((workoutExercise, i) => (
        <WorkoutExerciseSection key={`${workoutExercise.slug}-${i}`} workoutExercise={workoutExercise} />
      ))}
      <ConfirmModal
        isOpen={confirming}
        title="Delete this Workout?"
        message="It will be removed from your History. This can't be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirming(false)}
        onConfirm={handleDelete}
      />
    </Screen>
  );
}

function WorkoutExerciseSection({ workoutExercise: { slug, sets } }: { workoutExercise: WorkoutExercise }) {
  const { colors } = useTheme();
  const unilateral = libraryExercise(slug)?.unilateral;
  return (
    <View style={[styles.exercise, { borderColor: colors.line }]}>
      <Text weight="semiBold">{exerciseName(slug)}</Text>
      {sets.map((set, i) => (
        <SetRow key={set.loggedAt + i} set={set} index={i} unilateral={unilateral} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: "row",
    marginTop: spacing[4],
    paddingVertical: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  exercise: { gap: spacing[2], paddingVertical: spacing[4], borderTopWidth: StyleSheet.hairlineWidth },
});
