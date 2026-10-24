import type { InProgressWorkoutExercise, LoadType, SetValues } from "@fit/shared";
import { router } from "expo-router";
import { useState } from "react";
import { Button, ButtonIcon } from "@/components/button";
import { Card } from "@/components/card";
import { ConfirmModal } from "@/components/choice-modal";
import type { IconName } from "@/components/icons";
import { Input, InputField } from "@/components/input";
import { LoadingButton } from "@/components/loading-button";
import { Pressable } from "@/components/pressable";
import { Screen } from "@/components/screen";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { spacing } from "@/theme";
import { errorMessage } from "@/utils/error-message";
import { SetRow } from "../components/set-row";
import { describeSet, timeLabel } from "../format";
import { useHasEnded } from "../hooks/use-has-ended";
import { exerciseName, libraryExercise } from "../library";
import { useLogbook } from "../logbook-provider";

export default function WorkoutView() {
  const { workout, discard } = useLogbook();
  const { showToast } = useToast();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const hasEnded = useHasEnded(workout);

  // Finished or discarded: blank until the navigation away lands
  if (hasEnded) return <Screen edges={["bottom"]}>{null}</Screen>;
  if (!workout) {
    return (
      <Screen edges={["bottom"]}>
        <Text color="textMuted">No Workout in progress.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll edges={["bottom"]}>
      <Stack spacing={4} flex>
        <Text color="textMuted">Started {timeLabel(workout.startedAt)}</Text>
        {workout.workoutExercises.map((workoutExercise, i) => (
          <WorkoutExerciseCard
            key={workoutExercise.id}
            workoutExercise={workoutExercise}
            position={i}
            count={workout.workoutExercises.length}
          />
        ))}
        {workout.workoutExercises.length === 0 && (
          <Text color="textMuted">Add an Exercise to start logging Sets.</Text>
        )}
      </Stack>
      <Stack spacing={2} style={{ marginTop: spacing[6] }}>
        <LoadingButton label="Add exercise" action="secondary" icon="plus" href="/workout/add-exercise" />
        <LoadingButton label="Finish" icon="check" href="/workout/finish" />
        <LoadingButton
          label="Discard workout"
          action="negative"
          variant="outline"
          icon="trash"
          onPress={() => setConfirmingDiscard(true)}
        />
      </Stack>
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
            router.back();
          } catch (err) {
            showToast(`Couldn't discard: ${errorMessage(err)}`, { error: err });
          }
        }}
      />
    </Screen>
  );
}

// A small icon-only button for the controls on a Workout Exercise or Set
function IconButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      size="xs"
      action="default"
      variant="link"
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      hitSlop={spacing[2]}
    >
      <ButtonIcon name={icon} />
    </Button>
  );
}

function WorkoutExerciseCard({
  workoutExercise,
  position,
  count,
}: {
  workoutExercise: InProgressWorkoutExercise;
  position: number;
  count: number;
}) {
  const { removeWorkoutExercise, moveWorkoutExercise, logSet, editSet, deleteSet, nextSetDraft } = useLogbook();
  const { showToast } = useToast();
  // The Set being corrected, or null while logging a new one
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const exercise = libraryExercise(workoutExercise.slug);
  const name = exerciseName(workoutExercise.slug);
  const perSide = exercise?.unilateral ? " per side" : "";
  const { id, loadType, sets } = workoutExercise;
  const editingSet = editingIndex === null ? undefined : sets[editingIndex];

  const attempt = async (change: () => Promise<void>) => {
    try {
      await change();
    } catch (err) {
      showToast(errorMessage(err), { error: err });
    }
  };

  const remove = () => attempt(() => removeWorkoutExercise(id));

  return (
    <Card>
      <Stack spacing={3}>
        <HStack spacing={2} align="start">
          <Stack spacing={1} style={{ flex: 1 }}>
            <Text weight="semiBold">{name}</Text>
            {exercise?.unilateral && (
              <Text size="sm" color="textMuted">
                Log one side; the values count for each side
              </Text>
            )}
          </Stack>
          <IconButton
            icon="chevronUp"
            label={`Move ${name} up`}
            disabled={position === 0}
            onPress={() => attempt(() => moveWorkoutExercise(id, position - 1))}
          />
          <IconButton
            icon="chevronDown"
            label={`Move ${name} down`}
            disabled={position === count - 1}
            onPress={() => attempt(() => moveWorkoutExercise(id, position + 1))}
          />
          <IconButton
            icon="trash"
            label={`Remove ${name}`}
            onPress={() => (sets.length > 0 ? setConfirmingRemove(true) : remove())}
          />
        </HStack>
        {sets.map((set, i) => (
          <Pressable
            key={set.loggedAt + i}
            onPress={() => setEditingIndex(editingIndex === i ? null : i)}
            accessibilityRole="button"
            accessibilityLabel={`Set ${i + 1}, ${describeSet(set)}${perSide}. Edit`}
          >
            <SetRow set={set} index={i} unilateral={exercise?.unilateral} highlighted={editingIndex === i} />
          </Pressable>
        ))}
        {editingSet && editingIndex !== null ? (
          <Stack spacing={2}>
            <Text size="sm" color="textMuted">
              Editing Set {editingIndex + 1}
            </Text>
            <SetForm
              key={`edit-${editingIndex}`}
              loadType={loadType}
              initial={editingSet}
              submitLabel="Save"
              onSubmit={async (values) => {
                await editSet(id, editingIndex, values);
                setEditingIndex(null);
              }}
            />
            <HStack spacing={2}>
              <LoadingButton
                label="Delete set"
                size="sm"
                action="negative"
                variant="outline"
                icon="trash"
                onPress={() =>
                  attempt(async () => {
                    await deleteSet(id, editingIndex);
                    setEditingIndex(null);
                  })
                }
              />
              <LoadingButton label="Cancel" size="sm" action="default" onPress={() => setEditingIndex(null)} />
            </HStack>
          </Stack>
        ) : (
          // Remounts after each Set, so the fields start from the Set just logged
          <SetForm
            key={`new-${sets.length}`}
            loadType={loadType}
            initial={nextSetDraft(workoutExercise)}
            submitLabel="Log set"
            onSubmit={(values) => logSet(id, values)}
          />
        )}
      </Stack>
      <ConfirmModal
        isOpen={confirmingRemove}
        title={`Remove ${name}?`}
        message={`Its ${sets.length === 1 ? "Set" : `${sets.length} Sets`} will be deleted too.`}
        confirmLabel="Remove"
        onCancel={() => setConfirmingRemove(false)}
        onConfirm={async () => {
          setConfirmingRemove(false);
          await remove();
        }}
      />
    </Card>
  );
}

// The fields each Load Type asks for
const FIELDS: Record<LoadType, { key: "kg" | "reps" | "seconds"; label: string; decimal?: boolean }[]> = {
  external: [
    { key: "kg", label: "kg", decimal: true },
    { key: "reps", label: "reps" },
  ],
  bodyweight: [{ key: "reps", label: "reps" }],
  timed: [{ key: "seconds", label: "seconds" }],
};

// Entry row for a Set's values, starting from `initial` (the previous Set, or the Set being edited)
function SetForm({
  loadType,
  initial,
  submitLabel,
  onSubmit,
}: {
  loadType: LoadType;
  initial: SetValues | null;
  submitLabel: string;
  onSubmit: (values: SetValues) => Promise<void>;
}) {
  const { showToast } = useToast();
  const fields = FIELDS[loadType];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.flatMap(({ key }) => {
        const value = initial && key in initial ? (initial as Record<string, unknown>)[key] : undefined;
        return typeof value === "number" ? [[key, String(value)]] : [];
      }),
    ),
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const numbers = Object.fromEntries(fields.map(({ key }) => [key, Number(values[key]?.replace(",", "."))]));
    if (fields.some(({ key }) => !values[key]?.trim() || Number.isNaN(numbers[key]))) {
      showToast(`Enter ${fields.map((f) => f.label).join(" and ")}`, { type: "warning" });
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ kind: loadType, ...numbers } as SetValues);
    } catch (err) {
      showToast(errorMessage(err), { error: err });
    } finally {
      setSaving(false);
    }
  };

  return (
    <HStack spacing={2} align="center">
      {fields.map(({ key, label, decimal }) => (
        <Input key={key} size="md" style={{ flex: 1 }}>
          <InputField
            value={values[key] ?? ""}
            onChangeText={(text) => setValues((prev) => ({ ...prev, [key]: text }))}
            placeholder={label}
            keyboardType={decimal ? "decimal-pad" : "number-pad"}
            accessibilityLabel={label}
          />
        </Input>
      ))}
      <LoadingButton label={submitLabel} size="md" action="secondary" loading={saving} onPress={handleSubmit} />
    </HStack>
  );
}
