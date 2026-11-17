import { useState } from "react";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetItem,
  ActionsheetItemText,
  ActionsheetSectionHeaderText,
} from "@/components/actionsheet";
import { pastWorkoutDays, type PastWorkoutDay } from "../past-workout";

// Picks the earlier day a Manual Workout logged afterwards was done on (#129). The choice runs once the sheet has gone
export function PastWorkoutSheet({
  isOpen,
  onClose,
  onPick,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPick: (start: Date) => void;
}) {
  const [picked, setPicked] = useState<PastWorkoutDay | null>(null);
  const days = pastWorkoutDays(new Date());

  return (
    <Actionsheet
      isOpen={isOpen}
      onClose={onClose}
      onClosed={() => {
        if (picked) onPick(picked.start);
        setPicked(null);
      }}
    >
      <ActionsheetBackdrop />
      <ActionsheetContent>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>
        <ActionsheetSectionHeaderText>Which day was it?</ActionsheetSectionHeaderText>
        {days.map((day) => (
          <ActionsheetItem
            key={day.label}
            onPress={() => {
              setPicked(day);
              onClose();
            }}
          >
            <ActionsheetItemText>{day.label}</ActionsheetItemText>
          </ActionsheetItem>
        ))}
      </ActionsheetContent>
    </Actionsheet>
  );
}
