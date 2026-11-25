import { MOBILITY_FOCUSES, MOBILITY_MINUTES, type RecoveryExercise } from "@fit/engines";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetScrollView,
} from "@/components/actionsheet";
import { Button, ButtonText } from "@/components/button";
import { Chip } from "@/components/chip";
import { Heading } from "@/components/heading";
import { LoadingButton } from "@/components/loading-button";
import { Pressable } from "@/components/pressable";
import { HStack } from "@/components/stack";
import { Text } from "@/components/text";
import { useWeightUnit } from "@/features/user/current-user-provider";
import { setTargetLabel } from "@/features/workouts/format";
import { useStartMobilityWorkout } from "@/features/workouts/hooks/use-open-workout";
import { exerciseName, setReading } from "@/features/workouts/library";
import { spacing, useTheme } from "@/theme";
import { useMobility } from "../hooks/use-mobility";
import { MOBILITY, NO_OTHER_HOLDS, mobilityFocusLabels, mobilityHoldLine, mobilityTotalLine } from "../today-status";

// The Mobility Workout before it starts: its length and focus, and the holds the app picked for them (#198).
// `openedAt` is null while it's closed
export function MobilitySheet({ openedAt, onClose }: { openedAt: Date | null; onClose: () => void }) {
  // The last opening's, so the list doesn't change as the sheet closes
  const shownAt = useRef(new Date());
  if (openedAt) shownAt.current = openedAt;
  const { stored, holds, chooseMinutes, chooseFocus, alternativesTo, swap, remove, keepExercises } = useMobility(
    shownAt.current,
  );
  const { startMobilityWorkout, startingMobility } = useStartMobilityWorkout();
  // The hold whose alternatives are open, and the showing they were opened in
  const [swapping, setSwapping] = useState<{ slug: string; shownAt: Date } | null>(null);
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
              {holds.map((hold) => {
                const isSwapping = swapping?.slug === hold.slug && swapping.shownAt === shownAt.current;
                return (
                  <HoldRow
                    key={hold.slug}
                    hold={hold}
                    alternatives={isSwapping ? alternativesTo(hold.slug) : null}
                    onSwap={() => setSwapping(isSwapping ? null : { slug: hold.slug, shownAt: shownAt.current })}
                    onSwapTo={(slug) => {
                      swap(hold.slug, slug);
                      setSwapping(null);
                    }}
                    onRemove={holds.length > 1 ? () => remove(hold.slug) : undefined}
                  />
                );
              })}
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

// A hold with its Swap and Remove. Its alternatives open below it, as iOS can't open a second sheet over this one.
// `alternatives` is null while they're closed, and with no `onRemove` it's the last hold, which stays
function HoldRow({
  hold,
  alternatives,
  onSwap,
  onSwapTo,
  onRemove,
}: {
  hold: RecoveryExercise;
  alternatives: string[] | null;
  onSwap: () => void;
  onSwapTo: (slug: string) => void;
  onRemove?: () => void;
}) {
  const unit = useWeightUnit();
  const { colors } = useTheme();
  const name = exerciseName(hold.slug);

  return (
    <View style={[styles.hold, { borderTopColor: colors.line }]}>
      <HStack spacing={3} align="center">
        <View style={styles.holdText}>
          <Text>{name}</Text>
          <Text size="sm" color="muted">
            {mobilityHoldLine(hold, setTargetLabel(hold.target, unit, setReading(hold.slug)))}
          </Text>
        </View>
        <Button
          variant="link"
          size="sm"
          hitSlop={8}
          accessibilityLabel={alternatives ? `Keep ${name}` : `Swap ${name}`}
          aria-expanded={!!alternatives}
          onPress={onSwap}
        >
          <ButtonText>{alternatives ? "Keep" : "Swap"}</ButtonText>
        </Button>
        {onRemove ? (
          <Button
            variant="link"
            action="negative"
            size="sm"
            hitSlop={8}
            accessibilityLabel={`Remove ${name}`}
            onPress={onRemove}
          >
            <ButtonText>Remove</ButtonText>
          </Button>
        ) : null}
      </HStack>
      {alternatives ? (
        <View style={styles.alternatives}>
          <Text size="sm" color="muted">
            {alternatives.length ? "Swap for" : NO_OTHER_HOLDS}
          </Text>
          {alternatives.map((slug) => (
            <Pressable
              key={slug}
              accessibilityRole="button"
              accessibilityLabel={`Swap ${name} for ${exerciseName(slug)}`}
              onPress={() => onSwapTo(slug)}
              style={styles.alternative}
            >
              <Text color="accent">{exerciseName(slug)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { width: "100%" },
  content: { gap: spacing[3], paddingBottom: spacing[3] },
  // Outside the scroll, so Start is in reach however long the list is
  start: { width: "100%", paddingTop: spacing[3] },
  holdText: { flex: 1, gap: 2 },
  alternatives: { paddingLeft: spacing[3] },
  alternative: { minHeight: 44, justifyContent: "center" },
  hold: { paddingVertical: spacing[2], gap: 2, borderTopWidth: StyleSheet.hairlineWidth },
});
