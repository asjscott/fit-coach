import type { Workout, WorkoutExercise } from "@fit/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Button, ButtonText } from "@/components/button";
import { Card } from "@/components/card";
import { Heading } from "@/components/heading";
import { Loading } from "@/components/loading";
import { LoadingButton } from "@/components/loading-button";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/modal";
import { Screen } from "@/components/screen";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { spacing } from "@/theme";
import { dateLabel, describeSet, durationLabel, timeLabel } from "../format";
import { useHistory } from "../history-provider";
import { libraryExercise } from "../library";

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

// The detail of an uploaded Workout from History, found in the list History loaded
export default function WorkoutDetailView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workouts, error, isLoading, refresh, deleteWorkout } = useHistory();
  const workout = workouts?.find((w) => w.id === id);

  // Opened directly (e.g. a web reload) before History has loaded
  useEffect(() => {
    if (!workouts) refresh();
  }, [workouts, refresh]);

  if (isLoading) return <Loading message="Loading workout..." />;
  if (!workout) {
    return (
      <Screen edges={["bottom"]}>
        <Text color={error ? "danger" : "textMuted"}>{error ?? "This Workout isn't in your History."}</Text>
      </Screen>
    );
  }

  return <WorkoutDetail workout={workout} onDelete={() => deleteWorkout(workout.id)} />;
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
export function WorkoutDetail({ workout, note, onDelete }: WorkoutDetailProps) {
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      setConfirming(false);
      showToast("Workout deleted", { type: "success" });
      router.back();
    } catch (err) {
      setConfirming(false);
      showToast(`Couldn't delete: ${errorMessage(err)}`, { error: err });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen scroll edges={["bottom"]}>
      <Stack spacing={4} flex>
        <Stack spacing={1}>
          <Heading size="xl">{dateLabel(workout.startedAt)}</Heading>
          <Text color="textMuted" tabular>
            {timeLabel(workout.startedAt)} – {timeLabel(workout.endedAt)} · {durationLabel(workout)}
          </Text>
          {note !== undefined && (
            <Text size="sm" color="textMuted">
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

      <Modal isOpen={confirming} onClose={() => !deleting && setConfirming(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="md">Delete this workout?</Heading>
          </ModalHeader>
          <ModalBody>
            <Text color="textMuted">It will be removed from your History. This can't be undone.</Text>
          </ModalBody>
          <ModalFooter>
            <Button action="default" size="sm" disabled={deleting} onPress={() => setConfirming(false)}>
              <ButtonText>Cancel</ButtonText>
            </Button>
            <LoadingButton label="Delete" action="negative" size="sm" loading={deleting} onPress={handleDelete} />
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Screen>
  );
}

function WorkoutExerciseCard({ workoutExercise }: { workoutExercise: WorkoutExercise }) {
  // An Exercise this app version doesn't know shows as its slug
  const exercise = libraryExercise(workoutExercise.slug);
  const perSide = exercise?.unilateral ? " per side" : "";

  return (
    <Card>
      <Stack spacing={2}>
        <Text weight="semiBold">{exercise?.name ?? workoutExercise.slug}</Text>
        {workoutExercise.sets.map((set, i) => (
          <HStack key={set.loggedAt + i} spacing={3}>
            <Text weight="semiBold" color="textSubtle">
              {i + 1}
            </Text>
            <Text>
              {describeSet(set)}
              {perSide}
            </Text>
          </HStack>
        ))}
      </Stack>
    </Card>
  );
}
