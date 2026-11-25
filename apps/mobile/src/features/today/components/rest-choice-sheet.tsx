import { REST_CHOICES, type RestChoice } from "@fit/engines";
import { StyleSheet, View } from "react-native";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetSectionHeaderText,
} from "@/components/actionsheet";
import { Chip } from "@/components/chip";
import { HStack } from "@/components/stack";
import { Text } from "@/components/text";
import { restChoiceLabel } from "@/features/workouts/format";
import { spacing } from "@/theme";

// Chooses the rest between Sets for planned and Manual Workouts (#178). It stays open, so a choice can be compared with
// the next; what it changes shows on Today behind it
export function RestChoiceSheet({
  isOpen,
  onClose,
  choice,
  onChoose,
}: {
  isOpen: boolean;
  onClose: () => void;
  choice: RestChoice;
  onChoose: (choice: RestChoice) => void;
}) {
  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>
        <ActionsheetSectionHeaderText>Rest between Sets</ActionsheetSectionHeaderText>
        <View style={styles.content}>
          <HStack spacing={2} wrap="wrap">
            {REST_CHOICES.map((option) => (
              <Chip
                key={option}
                label={restChoiceLabel(option)}
                selected={option === choice}
                onPress={() => onChoose(option)}
              />
            ))}
          </HStack>
          <Text size="sm" color="muted">
            Auto suits the rest to each Exercise. An Assessment always uses Auto.
          </Text>
        </View>
      </ActionsheetContent>
    </Actionsheet>
  );
}

const styles = StyleSheet.create({
  content: { width: "100%", gap: spacing[3], paddingBottom: spacing[3] },
});
