import type { InProgressWorkoutExercise, LoadType, SetValues } from "@fit/shared";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { LoadingButton } from "@/components/loading-button";
import { SectionLabel } from "@/components/section-label";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { fonts, radii, spacing, useTheme } from "@/theme";
import { errorMessage } from "@/utils/error-message";
import { previousSetsLabel } from "../format";
import { exerciseName, libraryExercise } from "../library";
import { useLogbook } from "../logbook-provider";
import { draftValues, setDraft, SET_FIELDS, type SetDraft } from "../set-entry";
import { SetRow } from "./set-row";
import { SetStepper } from "./set-stepper";
import { WorkoutExerciseMenu } from "./workout-exercise-menu";

export type CurrentExerciseBoxProps = {
  workoutExercise: InProgressWorkoutExercise;
  // Its place in the Workout, from 0, and how many there are
  position: number;
  count: number;
};

// The Workout Exercise being logged: its name, Previous Sets, the Sets so far (press one to correct it) and
// steppers for the next Set, which starts from the previous one
export function CurrentExerciseBox({ workoutExercise, position, count }: CurrentExerciseBoxProps) {
  const { colors } = useTheme();
  const { logSet, editSet, deleteSet, nextSetDraft } = useLogbook();
  const { showToast } = useToast();
  // The Set being corrected, or null while logging a new one
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { id, slug, loadType, sets, previousSets } = workoutExercise;
  const unilateral = libraryExercise(slug)?.unilateral ?? false;
  const editingSet = editingIndex === null ? undefined : sets[editingIndex];
  const nextNumber = sets.length + 1;

  return (
    <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
      <HStack spacing={2} align="start">
        <Stack spacing={1} style={styles.title}>
          <SectionLabel color="accent">{`Exercise ${position + 1} of ${count}`}</SectionLabel>
          <Text accessibilityRole="header" style={styles.name}>
            {exerciseName(slug)}
          </Text>
        </Stack>
        <WorkoutExerciseMenu workoutExercise={workoutExercise} position={position} count={count} />
      </HStack>
      {previousSets ? (
        <Text size="sm" color="subtle" style={styles.note}>
          {previousSetsLabel(previousSets.sets)}
        </Text>
      ) : null}
      {unilateral ? (
        <Text size="sm" color="muted" style={styles.note}>
          Log one side; the values count for each side
        </Text>
      ) : null}

      {sets.length > 0 ? (
        <View style={styles.sets}>
          {sets.map((set, i) => (
            <SetRow
              key={set.loggedAt + i}
              set={set}
              index={i}
              unilateral={unilateral}
              editing={editingIndex === i}
              onPress={() => setEditingIndex(editingIndex === i ? null : i)}
            />
          ))}
        </View>
      ) : null}

      {editingSet && editingIndex !== null ? (
        <SetEntry
          key={`edit-${editingIndex}`}
          heading={`Editing set ${editingIndex + 1}`}
          loadType={loadType}
          initial={editingSet}
          submitLabel={`Save set ${editingIndex + 1}`}
          onSubmit={async (values) => {
            await editSet(id, editingIndex, values);
            setEditingIndex(null);
          }}
        >
          <HStack spacing={2}>
            <LoadingButton
              label="Delete set"
              size="md"
              action="negative"
              variant="outline"
              icon="trash"
              style={styles.half}
              onPress={async () => {
                try {
                  await deleteSet(id, editingIndex);
                  setEditingIndex(null);
                } catch (err) {
                  showToast(errorMessage(err), { error: err });
                }
              }}
            />
            <LoadingButton
              label="Cancel"
              size="md"
              action="secondary"
              style={styles.half}
              onPress={() => setEditingIndex(null)}
            />
          </HStack>
        </SetEntry>
      ) : (
        // Remounts after each Set, so the steppers start from the Set just logged
        <SetEntry
          key={`new-${sets.length}`}
          heading={`Set ${nextNumber}`}
          loadType={loadType}
          initial={nextSetDraft(workoutExercise)}
          submitLabel={`Log set ${nextNumber}`}
          onSubmit={(values) => logSet(id, values)}
        />
      )}

      {/* Kept free for the rest timer, so adding it later doesn't move anything */}
      <View style={styles.restSlot} />
    </View>
  );
}

type SetEntryProps = {
  heading: string;
  loadType: LoadType;
  // The previous Set, the Set being edited, or null for an empty start
  initial: SetValues | null;
  submitLabel: string;
  onSubmit: (values: SetValues) => Promise<void>;
  // Shown under the submit button, e.g. Delete set and Cancel while editing
  children?: ReactNode;
};

// "Set 3", one stepper per value the Load Type records, and the button that logs or saves the Set
function SetEntry({ heading, loadType, initial, submitLabel, onSubmit, children }: SetEntryProps) {
  const { showToast } = useToast();
  const [draft, setDraftState] = useState<SetDraft>(() => setDraft(loadType, initial));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const result = draftValues(loadType, draft);
    if ("error" in result) {
      showToast(result.error, { type: "warning" });
      return;
    }
    setSaving(true);
    try {
      await onSubmit(result.values);
    } catch (err) {
      showToast(errorMessage(err), { error: err });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3} style={styles.entry}>
      <Text size="sm" color="muted" weight="semiBold">
        {heading}
      </Text>
      {SET_FIELDS[loadType].map((field) => (
        <SetStepper
          key={field}
          field={field}
          value={draft[field] ?? ""}
          onChange={(value) => setDraftState((prev) => ({ ...prev, [field]: value }))}
        />
      ))}
      <LoadingButton label={submitLabel} size="lg" loading={saving} onPress={handleSubmit} fullWidth />
      {children}
    </Stack>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1.5, borderRadius: radii.md, padding: spacing[4] },
  title: { flex: 1, paddingTop: spacing[1] },
  name: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  note: { marginTop: spacing[1] },
  sets: { marginTop: spacing[3] },
  entry: { marginTop: spacing[4] },
  half: { flex: 1 },
  restSlot: { height: 44, marginTop: spacing[3] },
});
