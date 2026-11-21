import type { FoodEntryAdd, FoodProposal, PortionChoice } from "@fit/shared";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetScrollView,
} from "@/components/actionsheet";
import { Heading } from "@/components/heading";
import { Icon } from "@/components/icons";
import { LoadingButton } from "@/components/loading-button";
import { Pressable } from "@/components/pressable";
import { Slider, SliderFilledTrack, SliderThumb, SliderTrack } from "@/components/slider";
import { Text } from "@/components/text";
import { spacing } from "@/theme";
import { portionAt, proposalPortionLine, proposalSlider, proposalWhen } from "../proposal";

type ConfirmProposalsSheetProps = {
  isOpen: boolean;
  // The Coach's latest answer, kept while the sheet closes. A new answer has a new `answer` number, which starts over
  // with its own portions
  proposals: FoodProposal[];
  answer: number;
  today: string;
  onClose: () => void;
  // Logs one as a Food Entry, answering whether it worked
  onLog: (date: string, add: FoodEntryAdd) => Promise<boolean>;
};

// What the Coach understood, before anything is logged (spec #158 story 81): each food with where it goes and a portion
// slider, any of them left out with ✕. Confirming logs them one by one through the ordinary Food Entry route; if one
// fails, those already logged leave the list and the rest stay to try again
export function ConfirmProposalsSheet({
  isOpen,
  proposals,
  answer,
  today,
  onClose,
  onLog,
}: ConfirmProposalsSheetProps) {
  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>
        <ProposalList key={answer} proposals={proposals} today={today} onClose={onClose} onLog={onLog} />
      </ActionsheetContent>
    </Actionsheet>
  );
}

function ProposalList({
  proposals: proposed,
  today,
  onClose,
  onLog,
}: Pick<ConfirmProposalsSheetProps, "proposals" | "today" | "onClose" | "onLog">) {
  const [proposals, setProposals] = useState(proposed);
  const [logging, setLogging] = useState(false);

  const setPortion = (index: number, portion: PortionChoice) =>
    setProposals((list) => list.map((p, i) => (i === index ? { ...p, portion } : p)));
  const leaveOut = (index: number) => setProposals((list) => list.filter((_, i) => i !== index));

  const confirm = async () => {
    setLogging(true);
    for (const [i, { date, meal, food, portion }] of proposals.entries()) {
      if (!(await onLog(date, { meal, food, portion }))) {
        setProposals(proposals.slice(i));
        setLogging(false);
        return;
      }
    }
    onClose();
  };

  if (!proposals.length) {
    return (
      <View style={styles.body}>
        <Heading size="lg">No food found</Heading>
        <Text color="muted">Say what you ate and how much, like “two eggs and a slice of toast for breakfast”.</Text>
        <LoadingButton label="OK" size="lg" fullWidth onPress={onClose} />
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <Heading size="lg">Is this right?</Heading>
      <ActionsheetScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {proposals.map((proposal, index) => (
          <ProposalRow
            key={`${proposal.food.id}-${index}`}
            proposal={proposal}
            today={today}
            disabled={logging}
            onPortion={(portion) => setPortion(index, portion)}
            onLeaveOut={() => leaveOut(index)}
          />
        ))}
      </ActionsheetScrollView>
      <View style={styles.buttons}>
        <LoadingButton label="Cancel" size="lg" variant="outline" disabled={logging} onPress={onClose} />
        <LoadingButton
          label={proposals.length === 1 ? "Log 1 food" : `Log ${proposals.length} foods`}
          size="lg"
          loading={logging}
          onPress={confirm}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

function ProposalRow({
  proposal: { date, meal, food, portion },
  today,
  disabled,
  onPortion,
  onLeaveOut,
}: {
  proposal: FoodProposal;
  today: string;
  disabled: boolean;
  onPortion: (portion: PortionChoice) => void;
  onLeaveOut: () => void;
}) {
  // The slider's range is set by what the Coach understood, so it doesn't move as the portion does
  const [slider] = useState(() => proposalSlider(portion));
  const line = proposalPortionLine(food, portion);

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={{ flex: 1 }}>
          <Text weight="semiBold">{food.name}</Text>
          <Text size="sm" color="muted">
            {proposalWhen({ date, meal }, today)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Leave out ${food.name}`}
          hitSlop={8}
          disabled={disabled}
          onPress={onLeaveOut}
        >
          <Icon name="circleX" color="subtle" size={22} />
        </Pressable>
      </View>
      <Slider
        value={"serving" in portion ? portion.count : portion.grams}
        minValue={slider.min}
        maxValue={slider.max}
        step={slider.step}
        isDisabled={disabled}
        onChange={(value) => onPortion(portionAt(portion, value))}
        accessibilityLabel={`Portion of ${food.name}`}
      >
        <SliderTrack>
          <SliderFilledTrack />
        </SliderTrack>
        <SliderThumb />
      </Slider>
      <Text size="sm" accessibilityLiveRegion="polite">
        {line}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing[4], paddingBottom: spacing[4] },
  list: { maxHeight: 420 },
  listContent: { gap: spacing[5] },
  row: { gap: spacing[2] },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  buttons: { flexDirection: "row", gap: spacing[3] },
});
