import {
  isSkippedTest,
  REST_ADJUSTMENT_SECONDS,
  restSecondsLeft,
  takesNoMoreSets,
  TEST_REPS,
  upNext,
} from "@fit/engines";
import type { InProgressWorkout, InProgressWorkoutExercise, SetTarget } from "@fit/shared";
import { useEffect } from "react";
import { Keyboard, Modal, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Icon } from "@/components/icons";
import { LoadingButton } from "@/components/loading-button";
import { Pressable } from "@/components/pressable";
import { SafeAreaProvider, SafeAreaView } from "@/components/safe-area-view";
import { SectionLabel } from "@/components/section-label";
import { HStack } from "@/components/stack";
import { Switch } from "@/components/switch";
import { TABULAR, Text } from "@/components/text";
import { usePrimaryEquipmentProfile, useWeightUnit } from "@/features/user/current-user-provider";
import { useNow } from "@/hooks/use-now";
import { columnMaxWidth, fonts, spacing, useTheme } from "@/theme";
import { elapsedClockLabel, upNextLabel } from "../format";
import { exerciseName, setReading, targetReading } from "../library";
import { useLogbook, type CurrentRest } from "../logbook-provider";
import { protocolNote } from "../protocol-note";
import { hasRestSound, unlockRestSound } from "../rest-sound";
import { NextButtons, type NextAction } from "./current-exercise-box";
import { LastSetRpe } from "./last-set-rpe";

type RestScreenProps = { workout: InProgressWorkout; next?: NextAction };

// Over the logging screen, so it's ready for the next Set when this goes at zero (#179). `next` moves on from the
// Exercise the rest follows (#180)
export function RestScreen({ workout, next }: RestScreenProps) {
  const { rest, minimizeRest } = useLogbook();
  const { colors } = useTheme();
  const expanded = !!rest?.expanded;

  return (
    <Modal visible={expanded} animationType="none" presentationStyle="fullScreen" onRequestClose={minimizeRest}>
      {/* A presented screen needs its own provider on iOS (docs/agents/workouts.md, #68) */}
      <SafeAreaProvider>
        <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={["top", "bottom"]}>
          {rest && expanded ? <Resting rest={rest} workout={workout} next={next} /> : null}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function Resting({ rest, workout, next }: RestScreenProps & { rest: CurrentRest }) {
  const { extendRest, shortenRest, skipRest, minimizeRest, restSoundOn, setRestSoundOn } = useLogbook();
  const logged = workout.workoutExercises.find(({ id }) => id === rest.afterId);

  // A typed load or reps leaves the keyboard up
  useEffect(() => Keyboard.dismiss(), []);

  return (
    <View style={styles.column}>
      <HStack align="center" style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Minimise the rest"
          onPress={minimizeRest}
          style={styles.minimize}
        >
          <Icon name="chevronDown" color="text" size={30} />
        </Pressable>
        {hasRestSound() ? (
          <HStack spacing={2} align="center">
            <Text color="muted">Sound</Text>
            <Switch
              accessibilityLabel="Sound"
              value={restSoundOn}
              onValueChange={(on) => {
                unlockRestSound();
                setRestSoundOn(on);
              }}
            />
          </HStack>
        ) : null}
      </HStack>
      <ScrollView contentContainerStyle={styles.content}>
        <Countdown rest={rest} />
        <Next workout={workout} afterId={rest.afterId} />
        {logged ? <LastSetRpe workoutExercise={logged} /> : null}
      </ScrollView>
      {next ? (
        <View style={styles.nextButtons}>
          <NextButtons next={next} />
        </View>
      ) : null}
      <HStack spacing={3}>
        <BigButton label={`−${REST_ADJUSTMENT_SECONDS} s`} onPress={shortenRest} />
        <BigButton label="Skip" onPress={skipRest} />
        <BigButton label={`+${REST_ADJUSTMENT_SECONDS} s`} onPress={extendRest} />
      </HStack>
    </View>
  );
}

// A digit's width as a share of the font size, with the colon counted as one
const CHARACTER_WIDTH = 0.6;

function Countdown({ rest }: { rest: CurrentRest }) {
  const now = useNow(100);
  const { width, height } = useWindowDimensions();
  const clock = elapsedClockLabel(restSecondsLeft(rest, new Date(now)) * 1000);
  const fontSize = Math.min(
    (Math.min(width, columnMaxWidth) - 2 * spacing[5]) / (clock.length * CHARACTER_WIDTH),
    height * 0.35,
  );

  return (
    <View>
      <Text centered color="muted" size="xl">
        Rest
      </Text>
      <Text
        centered
        numberOfLines={1}
        allowFontScaling={false}
        accessibilityRole="timer"
        accessibilityLabel={`Rest, ${clock} left`}
        style={[styles.clock, { fontSize, lineHeight: fontSize * 1.15 }]}
      >
        {clock}
      </Text>
    </View>
  );
}

// The Exercise and Set coming next with its target, or an Assessment's test with what it asks for; nothing once every
// Set is done
function Next({ workout, afterId }: { workout: InProgressWorkout; afterId: string }) {
  const { protocolState } = useLogbook();
  const primaryEquipment = usePrimaryEquipmentProfile();
  const unit = useWeightUnit();
  const protocolOf = (test: InProgressWorkoutExercise) =>
    workout.assessment && primaryEquipment ? protocolState(workout, test, primaryEquipment) : undefined;
  const next = upNext(
    workout.workoutExercises,
    afterId,
    workout.assessment
      ? (test) => {
          const protocol = protocolOf(test);
          return !isSkippedTest(test) && (!protocol || !takesNoMoreSets(protocol));
        }
      : undefined,
  );
  if (!next) return null;
  const { slug, loadType, sets, planned } = next.workoutExercise;
  const protocol = protocolOf(next.workoutExercise);
  // A test suggests a load for its Sets of 5, else says in words what it asks for
  const suggestedKg = protocol?.status === "working-up" ? protocol.suggestedKg : null;
  const target: SetTarget | undefined =
    suggestedKg === null ? planned?.target : { unit: "kg", kg: suggestedKg, reps: TEST_REPS };
  const asks =
    protocol && !target ? protocolNote(protocol, sets.length, loadType, { nextTest: false, unit }).text : undefined;
  // A test's target is one number, never a range
  const reading = protocol ? setReading(slug) : targetReading(slug, workout.deloadWeek);

  return (
    <View style={styles.next}>
      <SectionLabel color="accent">Next</SectionLabel>
      <Text centered accessibilityRole="header" style={styles.name}>
        {exerciseName(slug)}
      </Text>
      <Text centered size="xl" color="muted">
        {upNextLabel(next, target, unit, reading)}
      </Text>
      {asks ? (
        <Text centered size="lg" color="muted">
          {asks}
        </Text>
      ) : null}
    </View>
  );
}

function BigButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <LoadingButton label={label} size="xl" action="secondary" onPress={onPress} style={styles.bigButton} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  column: { flex: 1, width: "100%", maxWidth: columnMaxWidth, alignSelf: "center", padding: spacing[5] },
  top: { justifyContent: "space-between", minHeight: 44 },
  minimize: { width: 48, height: 48, justifyContent: "center" },
  content: { flexGrow: 1, justifyContent: "center", gap: spacing[6], paddingVertical: spacing[4] },
  clock: { fontFamily: fonts.bold, fontVariant: TABULAR },
  next: { alignItems: "center", gap: spacing[1] },
  name: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
  nextButtons: { marginBottom: spacing[3] },
  bigButton: { flex: 1, height: 80, paddingHorizontal: spacing[2] },
});
