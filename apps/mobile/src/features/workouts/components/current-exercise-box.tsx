import { exerciseLoadsKg, isRatedTest, TEST_REPS, type ProtocolState } from "@fit/engines";
import { RPE_SCALE, type InProgressWorkoutExercise, type LoadType, type SetValues } from "@fit/shared";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { ConfirmModal } from "@/components/choice-modal";
import { Chip } from "@/components/chip";
import { LoadingButton } from "@/components/loading-button";
import { SectionLabel } from "@/components/section-label";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { usePrimaryEquipmentProfile } from "@/features/user/current-user-provider";
import { fonts, radii, spacing, useTheme } from "@/theme";
import { errorMessage } from "@/utils/error-message";
import { describeSet, previousSetsLabel } from "../format";
import { exerciseName, libraryExercise } from "../library";
import { useLogbook } from "../logbook-provider";
import { draftValues, setDraft, SET_FIELDS, type SetDraft } from "../set-entry";
import { SetRow } from "./set-row";
import { SetStepper, type KgSteps } from "./set-stepper";
import { WorkoutExerciseMenu } from "./workout-exercise-menu";

export type CurrentExerciseBoxProps = {
  workoutExercise: InProgressWorkoutExercise;
  // Its place in the Workout, from 0, and how many there are
  position: number;
  count: number;
};

// The Workout Exercise being logged: its name, Previous Sets, the Sets so far (each with a ⋯ to edit or delete it) and
// steppers for the next Set, which starts from the previous one
export function CurrentExerciseBox({ workoutExercise, position, count }: CurrentExerciseBoxProps) {
  const { colors } = useTheme();
  const { workout, logSet, editSet, deleteSet, nextSetDraft, protocolState, nextLoadKg } = useLogbook();
  const primaryEquipment = usePrimaryEquipmentProfile();
  const { showToast } = useToast();
  // The Set being corrected, or null while logging a new one
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // The Set whose row shows Edit and Delete, and the Set waiting for its delete to be confirmed
  const [actionsIndex, setActionsIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const { id, slug, loadType, sets, previousSets } = workoutExercise;
  const unilateral = libraryExercise(slug)?.unilateral ?? false;
  const editingSet = editingIndex === null ? undefined : sets[editingIndex];
  const nextNumber = sets.length + 1;
  // In an Assessment Workout every Exercise is a test, and the Logbook says what it asks for next
  const protocol =
    workout?.assessment && primaryEquipment ? protocolState(workout, workoutExercise, primaryEquipment) : undefined;
  const note = protocol && protocolNote(protocol, sets.length, loadType);
  const asksRpe = !!workout && isRatedTest(workout, loadType);
  const kgSteps: KgSteps = {
    stepKg: (kg, direction) => nextLoadKg(slug, kg, direction, primaryEquipment),
    loadsKnown: exerciseLoadsKg(slug, primaryEquipment).length > 0,
  };

  return (
    <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
      <HStack spacing={2} align="start">
        <Stack spacing={1} style={styles.title}>
          <SectionLabel color="accent">{`Exercise ${position + 1} of ${count}`}</SectionLabel>
          <Text accessibilityRole="header" style={styles.name}>
            {exerciseName(slug)}
          </Text>
        </Stack>
        <WorkoutExerciseMenu workoutExercise={workoutExercise} />
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
      {note ? (
        <Text size="sm" color={note.finished ? "accent" : "muted"} style={styles.note}>
          {note.text}
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
              actions={{
                open: actionsIndex === i,
                onOpen: () => {
                  setActionsIndex(i);
                  if (editingIndex !== i) setEditingIndex(null);
                },
                onClose: () => {
                  setActionsIndex(null);
                  if (editingIndex === i) setEditingIndex(null);
                },
                onEdit: () => setEditingIndex(editingIndex === i ? null : i),
                onDelete: () => setDeletingIndex(i),
              }}
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
          asksRpe={asksRpe}
          kgSteps={kgSteps}
          submitLabel={`Save set ${editingIndex + 1}`}
          onSubmit={async (values) => {
            await editSet(id, editingIndex, values);
            setEditingIndex(null);
          }}
        >
          <LoadingButton label="Cancel" size="md" action="secondary" onPress={() => setEditingIndex(null)} />
        </SetEntry>
      ) : (
        // Remounts after each Set, so the steppers start from the Set just logged
        <SetEntry
          key={`new-${sets.length}`}
          heading={`Set ${nextNumber}`}
          loadType={loadType}
          initial={nextSetDraft(workoutExercise, protocol)}
          asksRpe={asksRpe}
          kgSteps={kgSteps}
          submitLabel={`Log set ${nextNumber}`}
          onSubmit={(values) => logSet(id, values)}
        />
      )}

      <ConfirmModal
        isOpen={deletingIndex !== null}
        title={`Delete set ${(deletingIndex ?? 0) + 1}?`}
        message="It can't be brought back."
        confirmLabel="Delete"
        onCancel={() => setDeletingIndex(null)}
        onConfirm={async () => {
          const index = deletingIndex;
          setDeletingIndex(null);
          if (index === null) return;
          try {
            await deleteSet(id, index);
            setActionsIndex(null);
            setEditingIndex(null);
          } catch (err) {
            showToast(errorMessage(err), { error: err });
          }
        }}
      />

      {/* Kept free for the rest timer, so adding it later doesn't move anything */}
      <View style={styles.restSlot} />
    </View>
  );
}

// What the test asks for next, and whether it's finished: Sets of 5 working up to RPE 9, the heaviest load for as many
// reps as possible (past 12 ends it as load-limited), or a bodyweight or timed test's one Set to the maximum
function protocolNote(
  protocol: ProtocolState,
  setCount: number,
  loadType: LoadType,
): { text: string; finished: boolean } {
  const workingUp = (text: string) => ({ text, finished: false });
  switch (protocol.status) {
    case "done":
      return { text: "Done: that Set was your top Set. On to the next test.", finished: true };
    case "load-limited":
      return {
        text: "Done: past 12 reps at your heaviest load. Your result is a lower bound, limited by your equipment.",
        finished: true,
      };
    case "one-set":
      return workingUp(
        loadType === "timed"
          ? "One Set: hold as long as you can with good form, then log the seconds."
          : "One Set: as many reps as you can with good form.",
      );
    case "at-heaviest":
      return workingUp(
        `${protocol.suggestedKg} kg is your heaviest: as many reps as you can to RPE 9. Past 12 reps ends the test.`,
      );
    case "working-up": {
      const kg = protocol.suggestedKg;
      if (setCount === 0) {
        const start = kg === null ? "Start light." : `Start at ${kg} kg.`;
        return workingUp(`Sets of ${TEST_REPS}, adding weight each Set until one is RPE 9. ${start}`);
      }
      return workingUp(
        kg === null
          ? `Add weight for the next Set of ${TEST_REPS}`
          : `Next: ${describeSet({ kind: "external", kg, reps: TEST_REPS })}, then rate it`,
      );
    }
  }
}

type SetEntryProps = {
  heading: string;
  loadType: LoadType;
  // The previous Set, the Set being edited, or null for an empty start
  initial: SetValues | null;
  // Asks how hard the Set felt, for an Assessment Workout's test Sets
  asksRpe?: boolean;
  kgSteps: KgSteps;
  submitLabel: string;
  onSubmit: (values: SetValues) => Promise<void>;
  // Shown under the submit button, e.g. Cancel while editing
  children?: ReactNode;
};

// "Set 3", one stepper per value the Load Type records, RPE chips when asked, and the button that logs or saves
// the Set
function SetEntry({
  heading,
  loadType,
  initial,
  asksRpe = false,
  kgSteps,
  submitLabel,
  onSubmit,
  children,
}: SetEntryProps) {
  const { showToast } = useToast();
  const [draft, setDraftState] = useState<SetDraft>(() => setDraft(loadType, initial));
  const [rpe, setRpe] = useState<number | undefined>(initial?.rpe);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const result = draftValues(loadType, draft);
    if ("error" in result) {
      showToast(result.error, { type: "warning" });
      return;
    }
    setSaving(true);
    try {
      await onSubmit(asksRpe ? { ...result.values, rpe } : result.values);
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
      {SET_FIELDS[loadType].map((field) => {
        const value = draft[field] ?? "";
        const onChange = (text: string) => setDraftState((prev) => ({ ...prev, [field]: text }));
        return field === "kg" ? (
          <SetStepper key={field} field={field} value={value} onChange={onChange} {...kgSteps} />
        ) : (
          <SetStepper key={field} field={field} value={value} onChange={onChange} />
        );
      })}
      {asksRpe ? (
        <Stack spacing={2}>
          <Text size="sm" color="muted">
            RPE: 10 is no more reps, 9 is one more
          </Text>
          <HStack spacing={2}>
            {RPE_SCALE.map((choice) => (
              <Chip key={choice} label={String(choice)} selected={rpe === choice} onPress={() => setRpe(choice)} />
            ))}
          </HStack>
        </Stack>
      ) : null}
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
  restSlot: { height: 44, marginTop: spacing[3] },
});
