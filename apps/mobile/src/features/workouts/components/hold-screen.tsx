import { holdState } from "@fit/engines";
import type { InProgressWorkout } from "@fit/shared";
import { useEffect } from "react";
import { AccessibilityInfo, Keyboard, Modal, Platform, ScrollView, StyleSheet, View } from "react-native";
import { LoadingButton } from "@/components/loading-button";
import { SafeAreaProvider, SafeAreaView } from "@/components/safe-area-view";
import { HStack } from "@/components/stack";
import { Text } from "@/components/text";
import { useWeightUnit } from "@/features/user/current-user-provider";
import { useNow } from "@/hooks/use-now";
import { columnMaxWidth, fonts, spacing, useTheme } from "@/theme";
import { plannedSetsLabel } from "../format";
import { holdWords } from "../hold-words";
import { exerciseName, targetReading } from "../library";
import { useLogbook, type CurrentHold } from "../logbook-provider";
import { BigClock } from "./big-clock";
import { RestFlash } from "./rest-flash";
import { SoundSwitch } from "./sound-switch";

// A strength Exercise's hold timer, over the logging screen (#196). Stop fills in the seconds there, to check and log
export function HoldScreen({ workout }: { workout: InProgressWorkout }) {
  const { hold, cancelHold } = useLogbook();
  const { colors } = useTheme();

  return (
    <Modal visible={!!hold} animationType="none" presentationStyle="fullScreen" onRequestClose={cancelHold}>
      {/* A presented screen needs its own provider on iOS (docs/agents/workouts.md, #68) */}
      <SafeAreaProvider>
        <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={["top", "bottom"]}>
          {hold ? <Holding current={hold} workout={workout} /> : null}
        </SafeAreaView>
        <RestFlash />
      </SafeAreaProvider>
    </Modal>
  );
}

function Holding({ current, workout }: { current: CurrentHold; workout: InProgressWorkout }) {
  const { stopHold, cancelHold } = useLogbook();
  const unit = useWeightUnit();
  const now = useNow(100);
  const { hold, run, workoutExerciseId } = current;
  // The clock may last have been looked at before the hold began
  const state = holdState(hold, run, new Date(now));
  const { phase, clock, label } = holdWords(state, hold.target);
  const held = workout.workoutExercises.find(({ id }) => id === workoutExerciseId);

  // A typed value leaves the keyboard up
  useEffect(() => Keyboard.dismiss(), []);

  // Android and the web read the heading out as it changes; iOS has no live regions
  useEffect(() => {
    if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(phase);
  }, [phase]);

  return (
    <View style={styles.column}>
      <HStack align="center" style={styles.top}>
        <SoundSwitch />
      </HStack>
      <ScrollView contentContainerStyle={styles.content}>
        <BigClock heading={phase} clock={clock} label={label} announce />
        {held ? (
          <View style={styles.exercise}>
            <Text centered accessibilityRole="header" style={styles.name}>
              {exerciseName(held.slug)}
            </Text>
            {held.planned && hold.target ? (
              <Text centered size="xl" color="muted">
                {`Target: ${plannedSetsLabel(held.planned, unit, targetReading(held.slug, workout.deloadWeek))}`}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <HStack spacing={3}>
        <LoadingButton label="Cancel" size="xl" action="secondary" onPress={cancelHold} style={styles.bigButton} />
        {state.phase === "lead-in" ? null : (
          <LoadingButton label="Stop" size="xl" onPress={stopHold} style={styles.bigButton} />
        )}
      </HStack>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  column: { flex: 1, width: "100%", maxWidth: columnMaxWidth, alignSelf: "center", padding: spacing[5] },
  top: { justifyContent: "flex-end", minHeight: 48 },
  content: { flexGrow: 1, justifyContent: "center", gap: spacing[6], paddingVertical: spacing[4] },
  exercise: { alignItems: "center", gap: spacing[1] },
  name: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
  bigButton: { flex: 1, height: 80, paddingHorizontal: spacing[2] },
});
