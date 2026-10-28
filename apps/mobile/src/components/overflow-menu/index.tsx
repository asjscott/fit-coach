import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { spacing } from "@/theme";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetItem,
  ActionsheetItemText,
} from "../actionsheet";
import { Icon, type IconName } from "../icons";

export type OverflowMenuItem = {
  label: string;
  onPress: () => void;
  // Drawn in danger, e.g. "Delete workout"
  destructive?: boolean;
  // Drawn before the label, e.g. "trash"
  icon?: IconName;
};

export type OverflowMenuProps = {
  // What the ⋯ button opens, for screen readers, e.g. "Workout actions"
  label: string;
  items: OverflowMenuItem[];
};

// A ⋯ button that opens its actions in a bottom sheet, keeping rare or destructive actions out of the way.
// An item runs once the sheet has gone, so it can open its own confirmation
export function OverflowMenu({ label, items }: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  // The item picked, waiting for the sheet to close
  const [picked, setPicked] = useState<OverflowMenuItem | null>(null);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
        onPress={() => setIsOpen(true)}
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Icon name="ellipsis" color="text" size={22} />
      </Pressable>
      <Actionsheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onClosed={() => {
          picked?.onPress();
          setPicked(null);
        }}
      >
        <ActionsheetBackdrop />
        <ActionsheetContent>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          {items.map((item) => (
            <ActionsheetItem
              key={item.label}
              style={item.icon ? styles.withIcon : undefined}
              onPress={() => {
                setPicked(item);
                setIsOpen(false);
              }}
            >
              {item.icon ? <Icon name={item.icon} color={item.destructive ? "danger" : "text"} size={20} /> : null}
              <ActionsheetItemText color={item.destructive ? "danger" : "text"}>{item.label}</ActionsheetItemText>
            </ActionsheetItem>
          ))}
        </ActionsheetContent>
      </Actionsheet>
    </>
  );
}

const styles = StyleSheet.create({
  withIcon: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
});
