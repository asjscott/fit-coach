import Ellipsis from "lucide-react-native/icons/ellipsis";
import { useState } from "react";
import { Pressable } from "react-native";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetItem,
  ActionsheetItemText,
} from "../actionsheet";
import { Icon } from "../icons";

export type OverflowMenuItem = {
  label: string;
  onPress: () => void;
  // Drawn in danger, e.g. "Delete workout"
  destructive?: boolean;
};

export type OverflowMenuProps = {
  // What the ⋯ button opens, for screen readers, e.g. "Workout actions"
  label: string;
  items: OverflowMenuItem[];
};

// A ⋯ button that opens its actions in a bottom sheet, keeping rare or destructive actions out of the way.
// The sheet closes before an item runs, so the item can open its own confirmation
export function OverflowMenu({ label, items }: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
        onPress={() => setIsOpen(true)}
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Icon as={Ellipsis} color="text" size={22} />
      </Pressable>
      <Actionsheet isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ActionsheetBackdrop />
        <ActionsheetContent>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          {items.map((item) => (
            <ActionsheetItem
              key={item.label}
              onPress={() => {
                setIsOpen(false);
                item.onPress();
              }}
            >
              <ActionsheetItemText color={item.destructive ? "danger" : "text"}>{item.label}</ActionsheetItemText>
            </ActionsheetItem>
          ))}
        </ActionsheetContent>
      </Actionsheet>
    </>
  );
}
