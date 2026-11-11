import { finishTimes, LogbookError, summarizeWorkout } from "@fit/engines";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { SectionLabel } from "@/components/section-label";
import { Stack } from "@/components/stack";
import { Stat } from "@/components/stat";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { spacing, useTheme } from "@/theme";
import { DateTimeField } from "../components/date-time-field";
import { NothingToSaveModal } from "../components/nothing-to-save-modal";
import { kgLabel, setsLabel, timeStat, workoutWhenLabel } from "../format";
import { useHasEnded } from "../hooks/use-has-ended";
import { useLeaveWorkout } from "../hooks/use-leave-workout";
import { exerciseName } from "../library";
import { useLogbook, type FinishOutcome } from "../logbook-provider";
import { toastWhenUploaded } from "../upload-toast";

// Leads with what the user did, with Save workout as the one-tap main action. The times start as Start and now,
// behind Edit times for backfilled and forgotten Workouts. A Workout logged afterwards for an earlier day starts on that
// day, an hour long, with its times open to edit (#129)
export default function FinishView() {
  const { workout, finish } = useLogbook();
  const { showToast } = useToast();
  const { colors } = useTheme();
  // Kept to the second, so a short Workout isn't rounded down to start and end in the same minute
  const [initialTimes] = useState(() => workout && finishTimes(workout, new Date()));
  const [startedAt, setStartedAt] = useState(() => initialTimes?.startedAt ?? new Date());
  const [endedAt, setEndedAt] = useState(() => initialTimes?.endedAt ?? new Date());
  const [isEditingTimes, setIsEditingTimes] = useState(() => !!workout?.pastStart);
  const [startError, setStartError] = useState<string>();
  const [endError, setEndError] = useState<string>();
  const [finishing, setFinishing] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const hasEnded = useHasEnded(workout);
  const leaveWorkout = useLeaveWorkout();

  // Finished: blank until the navigation back to the tabs lands
  if (hasEnded) return <Screen edges={["bottom"]}>{null}</Screen>;
  if (!workout) {
    return (
      <Screen edges={["bottom"]}>
        <Text color="muted">No Workout in progress.</Text>
      </Screen>
    );
  }

  const summary = summarizeWorkout({
    ...workout,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
  });
  const saved = workout.workoutExercises.filter((we) => we.sets.length > 0);
  const leftOut = workout.workoutExercises.filter((we) => we.sets.length === 0);

  const changeTime = (set: (date: Date) => void) => (date: Date) => {
    set(date);
    setStartError(undefined);
    setEndError(undefined);
  };

  const showOutcome = (outcome: FinishOutcome) => {
    if (outcome.status === "nothing-to-save") {
      setConfirmingDiscard(true);
      return;
    }
    toastWhenUploaded(showToast, outcome.uploaded, workout.assessment);
    leaveWorkout();
  };

  const handleSave = async () => {
    setFinishing(true);
    try {
      showOutcome(await finish({ startedAt, endedAt }));
    } catch (err) {
      // The time rules: a start more than 7 days back, an end before the start or in the future
      if (err instanceof LogbookError) {
        if (err.field === "startedAt") setStartError(err.message);
        else setEndError(err.message);
        setIsEditingTimes(true);
      } else showToast("Couldn't finish", { error: err });
    } finally {
      setFinishing(false);
    }
  };

  return (
    <Screen scroll="screen" edges={["bottom"]} contentStyle={{ flexGrow: 1 }}>
      <View style={styles.times}>
        <Text color="muted" style={{ flex: 1 }}>
          {workoutWhenLabel({ startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString() })}
        </Text>
        <LoadingButton
          label={isEditingTimes ? "Done" : "Edit times"}
          variant="link"
          action="default"
          size="md"
          onPress={() => setIsEditingTimes(!isEditingTimes)}
        />
      </View>
      {isEditingTimes && (
        <Stack spacing={3} style={styles.timeFields}>
          <DateTimeField label="Start" value={startedAt} onChange={changeTime(setStartedAt)} error={startError} />
          <DateTimeField label="End" value={endedAt} onChange={changeTime(setEndedAt)} error={endError} />
        </Stack>
      )}
      <View style={[styles.stats, { borderColor: colors.line }]}>
        <Stat value={kgLabel(summary.volumeKg)} unit="kg" label="Volume" size="3xl" />
        <Stat value={String(summary.sets)} label="Sets" size="3xl" />
        <Stat {...timeStat(Math.max(0, summary.durationMs))} label="Time" size="3xl" />
      </View>
      <SectionLabel right={String(summary.exercises)} style={styles.sectionLabel}>
        Exercises
      </SectionLabel>
      {saved.map((we) => (
        <View key={we.id} style={[styles.exercise, { borderTopColor: colors.line }]}>
          <Text weight="semiBold" style={{ flex: 1 }}>
            {exerciseName(we.slug)}
          </Text>
          <Text color="muted">{setsLabel(we.sets.length)}</Text>
        </View>
      ))}
      {leftOut.length > 0 && (
        <Text size="sm" color="muted" style={styles.leftOut}>
          Left out, with no Sets: {leftOut.map((we) => exerciseName(we.slug)).join(", ")}
        </Text>
      )}
      <View style={styles.footer}>
        <LoadingButton label="Save workout" icon="check" loading={finishing} onPress={handleSave} fullWidth />
      </View>
      <NothingToSaveModal
        isOpen={confirmingDiscard}
        onClose={() => setConfirmingDiscard(false)}
        onDiscarded={leaveWorkout}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  times: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  timeFields: { marginTop: spacing[2], marginBottom: spacing[2] },
  stats: {
    flexDirection: "row",
    marginTop: spacing[4],
    paddingVertical: spacing[5],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: { marginTop: spacing[7], marginBottom: spacing[2] },
  exercise: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    minHeight: 52,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  leftOut: { marginTop: spacing[3] },
  footer: { flexGrow: 1, justifyContent: "flex-end", paddingTop: spacing[8] },
});
