import { MOBILITY_FOCUSES, MOBILITY_MINUTES } from "@fit/engines";
import { router } from "expo-router";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetScrollView,
} from "@/components/actionsheet";
import { Chip } from "@/components/chip";
import { Heading } from "@/components/heading";
import { LoadingButton } from "@/components/loading-button";
import { HStack } from "@/components/stack";
import { Text } from "@/components/text";
import { useWeightUnit } from "@/features/user/current-user-provider";
import { setTargetLabel } from "@/features/workouts/format";
import { useStartMobilityWorkout } from "@/features/workouts/hooks/use-open-workout";
import { exerciseName, setReading } from "@/features/workouts/library";
import { spacing, useTheme } from "@/theme";
import { useMobility } from "../hooks/use-mobility";
import { MOBILITY, mobilityFocusLabels, mobilityHoldLine, mobilityTotalLine } from "../today-status";

// The Mobility Workout before it starts: its length and focus, and the holds the app picked for them (#198).
// `openedAt` is null while it's closed
export function MobilitySheet({ openedAt, onClose }: { openedAt: Date | null; onClose: () => void }) {
  // The last opening's, so the list doesn't change as the sheet closes
  const shownAt = useRef(new Date());
  if (openedAt) shownAt.current = openedAt;
  const { stored, holds, chooseMinutes, chooseFocus, keepExercises } = useMobility(shownAt.current);
  const { startMobilityWorkout, startingMobility } = useStartMobilityWorkout();
  const unit = useWeightUnit();
  const { colors } = useTheme();
  // iOS can't present the Workout until the sheet has gone
  const startOnClosed = useRef(false);

  const handleStart = () => {
    startOnClosed.current = true;
    onClose();
  };
  const handleClosed = async () => {
    if (!startOnClosed.current) return;
    startOnClosed.current = false;
    if (!(await startMobilityWorkout(holds))) return;
    keepExercises(holds.map(({ slug }) => slug));
    router.push("/workout");
  };

  return (
    <Actionsheet isOpen={!!openedAt} onClose={onClose} onClosed={handleClosed}>
      <ActionsheetBackdrop />
      <ActionsheetContent>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>
        <ActionsheetScrollView style={styles.scroll}>
          <View style={styles.content}>
            <View style={{ gap: spacing[1] }}>
              <Heading size="lg">{MOBILITY}</Heading>
              <Text size="sm" color="muted">
                {mobilityTotalLine(holds)}
              </Text>
            </View>
            <HStack spacing={2} wrap="wrap">
              {MOBILITY_MINUTES.map((minutes) => (
                <Chip
                  key={minutes}
                  label={`${minutes} min`}
                  selected={minutes === stored?.minutes}
                  onPress={() => chooseMinutes(minutes)}
                />
              ))}
            </HStack>
            <HStack spacing={2} wrap="wrap">
              {MOBILITY_FOCUSES.map((focus) => (
                <Chip
                  key={focus}
                  label={mobilityFocusLabels[focus]}
                  selected={focus === stored?.focus}
                  onPress={() => chooseFocus(focus)}
                />
              ))}
            </HStack>
            <View>
              {holds.map((hold) => (
                <View key={hold.slug} style={[styles.hold, { borderTopColor: colors.line }]}>
                  <Text>{exerciseName(hold.slug)}</Text>
                  <Text size="sm" color="muted">
                    {mobilityHoldLine(hold, setTargetLabel(hold.target, unit, setReading(hold.slug)))}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ActionsheetScrollView>
        <View style={styles.start}>
          <LoadingButton
            label="Start mobility"
            fullWidth
            loading={startingMobility}
            disabled={!holds.length}
            onPress={handleStart}
          />
        </View>
      </ActionsheetContent>
    </Actionsheet>
  );
}

const styles = StyleSheet.create({
  scroll: { width: "100%" },
  content: { gap: spacing[3], paddingBottom: spacing[3] },
  // Outside the scroll, so Start is in reach however long the list is
  start: { width: "100%", paddingTop: spacing[3] },
  hold: { paddingVertical: spacing[2], gap: 2, borderTopWidth: StyleSheet.hairlineWidth },
});
