import { exerciseLoadsByEquipmentKg, isRatedTest, takesAnotherSet, takesNoMoreSets } from "@fit/engines";
import { RPE_SCALE, type InProgressWorkoutExercise, type LoadType, type SetValues } from "@fit/shared";
import { useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Alert, AlertIcon, AlertText } from "@/components/alert";
import { ConfirmModal } from "@/components/choice-modal";
import { Chip } from "@/components/chip";
import { LoadingButton } from "@/components/loading-button";
import { SectionLabel } from "@/components/section-label";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { usePrimaryEquipmentProfile, useWeightUnit } from "@/features/user/current-user-provider";
import { fonts, radii, spacing, useTheme } from "@/theme";
import { errorMessage } from "@/utils/error-message";
import { dumbbellBuildLabel, type BuildLabel } from "../dumbbell-build";
import { plannedSetsLabel, previousSetsLabel } from "../format";
import { exerciseName, targetReading, type SetReading } from "../library";
import { useLogbook } from "../logbook-provider";
import { protocolNote } from "../protocol-note";
import { draftValues, loadStep, rpeMissing, setDraft, SET_FIELDS, type SetDraft } from "../set-entry";
import { LastSetRpe } from "./last-set-rpe";
import { SetRow } from "./set-row";
import { SetStepper, type LoadSteps } from "./set-stepper";
import { WorkoutExerciseMenu } from "./workout-exercise-menu";

export type CurrentExerciseBoxProps = {
  workoutExercise: InProgressWorkoutExercise;
  // Its place in the Workout, from 0, and how many there are
  position: number;
  count: number;
  next?: NextAction;
};

// What moves on from an Exercise. "main" is the main button, with Log extra set under it to open the steppers, and
// "secondary" is under Log set. "test" is an Assessment Workout's Next test, only once the test takes no more Sets.
// After the walk's one Set either is the only button
export type NextAction = { label: string; onPress: () => void } & (
  { as: "test" | "secondary" } | { as: "main"; onLogExtra: () => void }
);

// The Workout Exercise being logged: its name, target, Previous Sets, the Sets so far (each with a ⋯ to edit or delete it) and
// steppers for the next Set, which starts from the previous one. A test that's done,
// or the walk once logged, takes no more Sets
export function CurrentExerciseBox({ workoutExercise, position, count, next }: CurrentExerciseBoxProps) {
  return (
    <ExerciseBox>
      <HStack spacing={2} align="start">
        <Stack spacing={1} style={styles.title}>
          <SectionLabel color="accent">{`Exercise ${position + 1} of ${count}`}</SectionLabel>
          <Text accessibilityRole="header" style={styles.name}>
            {exerciseName(workoutExercise.slug)}
          </Text>
        </Stack>
        <WorkoutExerciseMenu workoutExercise={workoutExercise} />
      </HStack>
      <ExerciseLogging workoutExercise={workoutExercise} next={next} />
    </ExerciseBox>
  );
}

// The box the current Exercise, or the current superset, is logged in
export function ExerciseBox({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.accent }]}>{children}</View>;
}

// Logging one Workout Exercise, under its name: its target, Previous Sets, the Sets so far and the next Set's
// steppers, or once it takes no more Sets, the next action. hideTarget leaves the target to the summary under the
// name, as a superset shows it. onLog is called as a Set is logged
export function ExerciseLogging({
  workoutExercise,
  next,
  hideTarget = false,
  onLog,
}: Pick<CurrentExerciseBoxProps, "workoutExercise" | "next"> & { hideTarget?: boolean; onLog?: () => void }) {
  const { workout, logSet, editSet, deleteSet, nextSetDraft, protocolState } = useLogbook();
  const primaryEquipment = usePrimaryEquipmentProfile();
  const unit = useWeightUnit();
  const { showToast } = useToast();
  // The Set being corrected, or null while logging a new one
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // The Set whose row shows Edit and Delete, and the Set waiting for its delete to be confirmed
  const [actionsIndex, setActionsIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const { id, slug, loadType, sets, previousSets, planned } = workoutExercise;
  const reading = targetReading(slug, workout?.deloadWeek);
  const editingSet = editingIndex === null ? undefined : sets[editingIndex];
  const nextNumber = sets.length + 1;
  // In an Assessment Workout every Exercise is a test, and the Logbook says what it asks for next
  const protocol =
    workout?.assessment && primaryEquipment ? protocolState(workout, workoutExercise, primaryEquipment) : undefined;
  const note = protocol && protocolNote(protocol, sets.length, loadType, { nextTest: !!next, unit });
  // A test that's done, or the walk once its one Set is logged (#109)
  const done = (!!protocol && takesNoMoreSets(protocol)) || !takesAnotherSet(workoutExercise);
  const asksRpe = !!workout && isRatedTest(workout, loadType);
  const loadsByEquipmentKg = exerciseLoadsByEquipmentKg(slug, primaryEquipment);
  const loadSteps: LoadSteps = {
    step: loadStep(loadsByEquipmentKg, unit),
    loadsKnown: loadsByEquipmentKg.length > 0,
    unit,
  };
  const buildLabel = useMemo(() => dumbbellBuildLabel(slug, primaryEquipment, unit), [slug, primaryEquipment, unit]);

  return (
    <>
      {planned && !hideTarget ? (
        <Text size="sm" color="muted" style={styles.note}>
          {`Target: ${plannedSetsLabel(planned, unit, reading)}`}
        </Text>
      ) : null}
      {previousSets ? (
        <Text size="sm" color="subtle" style={styles.note}>
          {previousSetsLabel(previousSets.sets, unit, reading)}
        </Text>
      ) : null}
      {reading.unilateral ? (
        <Text size="sm" color="muted" style={styles.note}>
          Log one side; the values count for each side
        </Text>
      ) : null}
      {note ? (
        // A banner, so what the test asks for next is easy to see between Sets
        <Alert action={note.finished ? "success" : "info"} style={styles.banner}>
          <AlertIcon />
          <AlertText size="md" weight="semiBold">
            {note.text}
          </AlertText>
        </Alert>
      ) : null}

      {sets.length > 0 ? (
        <View style={styles.sets}>
          {sets.map((set, i) => (
            <SetRow
              key={set.loggedAt + i}
              set={set}
              index={i}
              reading={reading}
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

      {editingIndex === null ? <LastSetRpe workoutExercise={workoutExercise} /> : null}

      {editingSet && editingIndex !== null ? (
        <SetEntry
          key={`edit-${editingIndex}`}
          heading={`Editing set ${editingIndex + 1}`}
          loadType={loadType}
          initial={editingSet}
          asksRpe={asksRpe}
          loadSteps={loadSteps}
          buildLabel={buildLabel}
          reading={reading}
          submitLabel={`Save set ${editingIndex + 1}`}
          onSubmit={async (values) => {
            await editSet(id, editingIndex, values);
            setEditingIndex(null);
          }}
        >
          <LoadingButton label="Cancel" size="md" action="secondary" onPress={() => setEditingIndex(null)} />
        </SetEntry>
      ) : done ? (
        next ? (
          <View style={styles.entry}>
            <LoadingButton label={next.label} size="lg" onPress={next.onPress} fullWidth />
          </View>
        ) : null
      ) : next?.as === "main" ? (
        <View style={styles.entry}>
          <NextButtons next={next} />
        </View>
      ) : (
        // Remounts after each Set, so the steppers start from the Set just logged
        <SetEntry
          key={`new-${sets.length}`}
          heading={`Set ${nextNumber}`}
          loadType={loadType}
          initial={nextSetDraft(workoutExercise, protocol)}
          asksRpe={asksRpe}
          loadSteps={loadSteps}
          buildLabel={buildLabel}
          reading={reading}
          submitLabel={`Log set ${nextNumber}`}
          onSubmit={(values) => {
            onLog?.();
            return logSet(id, values);
          }}
        >
          {next?.as === "secondary" ? <NextButtons next={next} /> : null}
        </SetEntry>
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
    </>
  );
}

// The next action, and as the main button, Log extra set under it, on the logging screen and the rest screen
export function NextButtons({ next }: { next: NextAction }) {
  return (
    <Stack spacing={3}>
      <LoadingButton
        label={next.label}
        size="lg"
        action={next.as === "secondary" ? "secondary" : "primary"}
        onPress={next.onPress}
        fullWidth
      />
      {next.as === "main" ? (
        <LoadingButton label="Log extra set" size="lg" action="secondary" onPress={next.onLogExtra} fullWidth />
      ) : null}
    </Stack>
  );
}

type SetEntryProps = {
  heading: string;
  loadType: LoadType;
  // The previous Set, the Set being edited, or null for an empty start
  initial: SetValues | null;
  // Asks how hard the Set felt, for an Assessment Workout's test Sets
  asksRpe?: boolean;
  loadSteps: LoadSteps;
  // How to build the load in the stepper, shown under it
  buildLabel: BuildLabel;
  reading: SetReading;
  submitLabel: string;
  onSubmit: (values: SetValues) => Promise<void>;
  // Shown under the submit button: Cancel while editing, or a secondary Next exercise
  children?: ReactNode;
};

// "Set 3", one stepper per value the Load Type records, RPE chips when asked, and the button that logs or saves
// the Set
function SetEntry({
  heading,
  loadType,
  initial,
  asksRpe = false,
  loadSteps,
  buildLabel,
  reading,
  submitLabel,
  onSubmit,
  children,
}: SetEntryProps) {
  const { showToast } = useToast();
  const [draft, setDraftState] = useState<SetDraft>(() => setDraft(loadType, initial, loadSteps.unit));
  const [rpe, setRpe] = useState<number | undefined>(initial?.rpe);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const result = draftValues(loadType, draft, loadSteps.unit);
    if ("error" in result) {
      showToast(result.error, { type: "warning" });
      return;
    }
    setSaving(true);
    try {
      // A Set being corrected keeps the RPE it was rated at, though only a test asks for it here
      await onSubmit(rpe === undefined ? result.values : { ...result.values, rpe });
    } catch (err) {
      showToast(errorMessage(err), { error: err });
    } finally {
      setSaving(false);
    }
  };

  const build = draft.load === undefined ? undefined : buildLabel(draft.load);

  return (
    <Stack spacing={3} style={styles.entry}>
      <Text size="sm" color="muted" weight="semiBold">
        {heading}
      </Text>
      {SET_FIELDS[loadType].map((field) => {
        const value = draft[field] ?? "";
        const onChange = (text: string) => setDraftState((prev) => ({ ...prev, [field]: text }));
        return field === "load" ? (
          <Stack key={field} spacing={1}>
            <SetStepper field={field} value={value} onChange={onChange} {...loadSteps} />
            {build ? (
              <Text size="sm" color="muted" centered>
                {build}
              </Text>
            ) : null}
          </Stack>
        ) : (
          <SetStepper key={field} field={field} value={value} onChange={onChange} reading={reading} />
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
      <LoadingButton
        label={submitLabel}
        size="lg"
        loading={saving}
        disabled={rpeMissing(asksRpe, rpe)}
        onPress={handleSubmit}
        fullWidth
      />
      {children}
    </Stack>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1.5, borderRadius: radii.md, padding: spacing[4] },
  title: { flex: 1, paddingTop: spacing[1] },
  name: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  note: { marginTop: spacing[1] },
  banner: { marginTop: spacing[3] },
  sets: { marginTop: spacing[3] },
  entry: { marginTop: spacing[4] },
});
