import { guidedHold, holdState, isHoldPaused, type GuidedHold } from "@fit/engines";
import { router } from "expo-router";
import { useEffect } from "react";
import { AccessibilityInfo, Keyboard, Modal, Platform, ScrollView, StyleSheet, View } from "react-native";
import { LoadingButton } from "@/components/loading-button";
import { SafeAreaProvider, SafeAreaView } from "@/components/safe-area-view";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useNow } from "@/hooks/use-now";
import { columnMaxWidth, fonts, spacing, useTheme } from "@/theme";
import { guidedClock, guidedHeading } from "../hold-words";
import { exerciseName, libraryExercise } from "../library";
import { useLogbook, type CurrentGuide } from "../logbook-provider";
import { BigClock } from "./big-clock";
import { RestFlash } from "./rest-flash";
import { SoundSwitch } from "./sound-switch";

// A Recovery Workout's holds, run hands-free over the logging screen (#200), which the last one leads from to
// Finish; or one Recovery Exercise timed alone, which leads back to it (#201)
export function GuidedScreen() {
  const { guide, pauseGuide, leaveGuide } = useLogbook();
  const { colors } = useTheme();
  const current = guide?.place.current;
  const over = !!guide && !current;
  const alone = !!guide?.course.only;

  useEffect(() => {
    if (!over) return;
    leaveGuide();
    if (!alone) router.push("/workout/finish");
  }, [over, alone, leaveGuide]);

  // Never runs on unseen
  useEffect(() => pauseGuide, [pauseGuide]);

  return (
    <Modal visible={!!current} animationType="none" presentationStyle="fullScreen" onRequestClose={leaveGuide}>
      {/* A presented screen needs its own provider on iOS (docs/agents/workouts.md, #68) */}
      <SafeAreaProvider>
        <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={["top", "bottom"]}>
          {current ? <Guiding guide={guide} current={current} /> : null}
        </SafeAreaView>
        <RestFlash />
      </SafeAreaProvider>
    </Modal>
  );
}

function Guiding({ guide, current }: { guide: CurrentGuide; current: GuidedHold }) {
  const { pauseGuide, resumeGuide, skipGuidedHold, backGuidedHold, leaveGuide } = useLogbook();
  const now = useNow(100);
  const { run, failed, place, course } = guide;
  const { position, count, next, hasPrevious, replaces } = place;
  const alone = !!course.only;
  const paused = isHoldPaused(run);
  // The clock may last have been looked at before the hold began
  const state = holdState(guidedHold(current), run, new Date(now));
  const heading = failed ? "Couldn\u2019t log this hold" : guidedHeading(state, current.sides, paused);
  const { clock, label } = guidedClock(state, heading);
  const name = exerciseName(current.slug);
  const announcement = state.phase === "lead-in" && state.side === 1 && !paused ? `${heading}: ${name}` : heading;

  // A typed walk leaves the keyboard up
  useEffect(() => Keyboard.dismiss(), []);

  // Android and the web read the heading out as it changes; iOS has no live regions
  useEffect(() => {
    if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(announcement);
  }, [announcement, position]);

  return (
    <View style={styles.column}>
      <HStack align="center" style={styles.top}>
        <Text color="muted">{`${alone ? `Set ${position}` : `Hold ${position} of ${count}`}${replaces === undefined ? "" : ", again"}`}</Text>
        <SoundSwitch />
      </HStack>
      <ScrollView contentContainerStyle={styles.content}>
        <BigClock heading={heading} clock={clock} label={label} announce />
        <Stack spacing={2}>
          <Text centered accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.name}>
            {name}
          </Text>
          {libraryExercise(current.slug)?.cues.map((cue) => (
            <Text key={cue} centered size="lg" color="muted">
              {cue}
            </Text>
          ))}
        </Stack>
        {alone ? null : (
          <Text centered color="muted">
            {next ? `Next: ${exerciseName(next.slug)}` : "Last hold"}
          </Text>
        )}
      </ScrollView>
      <Stack spacing={3}>
        <HStack spacing={3}>
          <LoadingButton
            label="Back"
            size="lg"
            action="secondary"
            disabled={!hasPrevious}
            onPress={backGuidedHold}
            style={styles.halfButton}
          />
          {alone ? null : (
            <LoadingButton
              label="Skip"
              size="lg"
              action="secondary"
              onPress={skipGuidedHold}
              style={styles.halfButton}
            />
          )}
        </HStack>
        <LoadingButton
          label={failed ? "Try again" : paused ? "Resume" : "Pause"}
          size="xl"
          onPress={paused ? resumeGuide : pauseGuide}
          fullWidth
          style={styles.bigButton}
        />
        <HStack spacing={3}>
          <LoadingButton
            label="Leave timer"
            size="md"
            variant="link"
            action="default"
            onPress={leaveGuide}
            style={styles.halfButton}
          />
          {alone ? null : (
            <LoadingButton
              label="Finish early"
              size="md"
              variant="link"
              action="default"
              onPress={() => {
                leaveGuide();
                router.push("/workout/finish");
              }}
              style={styles.halfButton}
            />
          )}
        </HStack>
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  column: { flex: 1, width: "100%", maxWidth: columnMaxWidth, alignSelf: "center", padding: spacing[5] },
  top: { justifyContent: "space-between", minHeight: 48 },
  content: { flexGrow: 1, justifyContent: "center", gap: spacing[6], paddingVertical: spacing[4] },
  name: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
  bigButton: { height: 80 },
  halfButton: { flex: 1, paddingHorizontal: spacing[2] },
});
