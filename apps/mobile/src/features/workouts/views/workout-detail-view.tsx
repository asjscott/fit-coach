import type { Workout, WorkoutExercise } from "@fit/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { ConfirmModal } from "@/components/choice-modal";
import { Heading } from "@/components/heading";
import { Loading } from "@/components/loading";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { spacing } from "@/theme";
import { errorMessage } from "@/utils/error-message";
import { SetRow } from "../components/set-row";
import { dateLabel, durationLabel, timeLabel } from "../format";
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
        note="Not uploaded yet. It uploads when you're back online."
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
  // A line under the date, e.g. that a Pending Workout hasn't uploaded yet
  note?: string;
  // Deletes the Workout wherever it lives; rejects to leave it in place
  onDelete: () => Promise<void>;
};

// Every Workout Exercise in order with its Sets, and Delete behind a confirmation.
// Takes the Workout and how to delete it, so an uploaded or a Pending Workout can use it
function WorkoutDetail({ workout, note, onDelete }: WorkoutDetailProps) {
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);

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
      <Stack spacing={4} flex>
        <Stack spacing={1}>
          <Heading size="xl">{dateLabel(workout.startedAt)}</Heading>
          <Text color="muted">
            {timeLabel(workout.startedAt)} – {timeLabel(workout.endedAt)} · {durationLabel(workout)}
          </Text>
          {note !== undefined && (
            <Text size="sm" color="muted">
              {note}
            </Text>
          )}
        </Stack>
        {workout.workoutExercises.map((workoutExercise, i) => (
          <WorkoutExerciseCard key={`${workoutExercise.slug}-${i}`} workoutExercise={workoutExercise} />
        ))}
      </Stack>
      <LoadingButton
        label="Delete workout"
        action="negative"
        variant="outline"
        icon="trash"
        style={{ marginTop: spacing[6] }}
        onPress={() => setConfirming(true)}
      />
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

function WorkoutExerciseCard({ workoutExercise: { slug, sets } }: { workoutExercise: WorkoutExercise }) {
  const unilateral = libraryExercise(slug)?.unilateral;
  return (
    <Card>
      <Stack spacing={2}>
        <Text weight="semiBold">{exerciseName(slug)}</Text>
        {sets.map((set, i) => (
          <SetRow key={set.loggedAt + i} set={set} index={i} unilateral={unilateral} />
        ))}
      </Stack>
    </Card>
  );
}
