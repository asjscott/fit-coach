import type { InProgressWorkoutExercise, LoadType, SetValues } from "@fit/shared";
import { router } from "expo-router";
import { useState } from "react";
import { Card } from "@/components/card";
import { Input, InputField } from "@/components/input";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { spacing } from "@/theme";
import { describeSet } from "../format";
import { libraryExercise } from "../library";
import { useLogbook } from "../logbook-provider";

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

export default function WorkoutView() {
  const { workout, finish } = useLogbook();
  const { showToast } = useToast();
  const [finishing, setFinishing] = useState(false);

  if (!workout) {
    return (
      <Screen edges={["bottom"]}>
        <Text color="textMuted">No Workout in progress.</Text>
      </Screen>
    );
  }

  const hasSets = workout.workoutExercises.some((we) => we.sets.length > 0);

  const handleFinish = async () => {
    setFinishing(true);
    try {
      const { uploaded } = await finish();
      showToast(uploaded ? "Workout saved" : "Saved on your phone; it will upload when you have signal", {
        type: uploaded ? "success" : "info",
      });
      router.back();
    } catch (err) {
      showToast(`Couldn't finish: ${errorMessage(err)}`, { error: err });
    } finally {
      setFinishing(false);
    }
  };

  return (
    <Screen scroll edges={["bottom"]}>
      <Stack spacing={4} flex>
        <Text color="textMuted">
          Started{" "}
          {new Date(workout.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </Text>
        {workout.workoutExercises.map((workoutExercise) => (
          <WorkoutExerciseCard key={workoutExercise.id} workoutExercise={workoutExercise} />
        ))}
        {workout.workoutExercises.length === 0 && (
          <Text color="textMuted">Add an Exercise to start logging Sets.</Text>
        )}
      </Stack>
      <Stack spacing={2} style={{ marginTop: spacing[6] }}>
        <LoadingButton label="Add exercise" action="secondary" icon="plus" href="/workout/add-exercise" />
        <LoadingButton label="Finish" icon="check" loading={finishing} disabled={!hasSets} onPress={handleFinish} />
      </Stack>
    </Screen>
  );
}

function WorkoutExerciseCard({ workoutExercise }: { workoutExercise: InProgressWorkoutExercise }) {
  const exercise = libraryExercise(workoutExercise.slug);
  const perSide = exercise?.unilateral ? " per side" : "";

  return (
    <Card>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Text weight="semiBold">{exercise?.name ?? workoutExercise.slug}</Text>
          {exercise?.unilateral && (
            <Text size="sm" color="textMuted">
              Log one side; the values count for each side
            </Text>
          )}
        </Stack>
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
        <SetForm workoutExerciseId={workoutExercise.id} loadType={workoutExercise.loadType} />
      </Stack>
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

// The fields keep what was typed after logging; pre-filling from the last Set comes later
function SetForm({ workoutExerciseId, loadType }: { workoutExerciseId: string; loadType: LoadType }) {
  const { logSet } = useLogbook();
  const { showToast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const fields = FIELDS[loadType];

  const handleLog = async () => {
    const numbers = Object.fromEntries(fields.map(({ key }) => [key, Number(values[key]?.replace(",", "."))]));
    if (fields.some(({ key }) => !values[key]?.trim() || Number.isNaN(numbers[key]))) {
      showToast(`Enter ${fields.map((f) => f.label).join(" and ")}`, { type: "warning" });
      return;
    }
    setSaving(true);
    try {
      await logSet(workoutExerciseId, { kind: loadType, ...numbers } as SetValues);
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
      <LoadingButton label="Log set" size="md" action="secondary" loading={saving} onPress={handleLog} />
    </HStack>
  );
}
