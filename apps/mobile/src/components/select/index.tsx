import { createContext, isValidElement, use, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { fonts, fontSizes, spacing, useThemedStyles } from "@/theme";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetFlatList,
  ActionsheetItem,
  ActionsheetScrollView,
  ActionsheetSectionHeaderText,
} from "../actionsheet";
import { useFormControlContext } from "../form-control";
import { Icon, type IconComponent, type IconName } from "../icons";
import { createInputStyles, inputSizes, type InputSize, type InputVariant } from "../input/styles";
import { Text } from "../text";

type SelectContextValue = {
  selectedValue: string | null;
  select: (value: string) => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  isDisabled: boolean;
  size: InputSize;
};

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = use(SelectContext);
  if (!context) throw new Error("Select parts must be used inside <Select>");
  return context;
}

export type SelectProps = {
  selectedValue?: string | null;
  onValueChange?: (value: string) => void;
  isDisabled?: boolean;
  disabled?: boolean;
  children?: ReactNode;
};

export function Select({ selectedValue = null, onValueChange, isDisabled, disabled, children }: SelectProps) {
  const [isOpen, setOpen] = useState(false);
  const formControl = useFormControlContext();
  const inactive = isDisabled ?? disabled ?? (formControl.isDisabled || formControl.isReadOnly) ?? false;

  const select = (value: string) => {
    onValueChange?.(value);
    setOpen(false);
  };

  return (
    <SelectContext
      value={{
        selectedValue,
        select,
        isOpen,
        open: () => setOpen(true),
        close: () => setOpen(false),
        isDisabled: !!inactive,
        size: "lg",
      }}
    >
      {children}
    </SelectContext>
  );
}

export type SelectTriggerProps = {
  variant?: InputVariant;
  size?: InputSize;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

// Looks like an Input; opens the sheet on press
export function SelectTrigger({ variant = "outline", size = "lg", style, children }: SelectTriggerProps) {
  const styles = useThemedStyles(createInputStyles);
  const { open, isOpen, isDisabled } = useSelectContext();
  const { isInvalid } = useFormControlContext();

  return (
    <Pressable
      accessibilityRole="combobox"
      accessibilityState={{ expanded: isOpen, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={open}
      style={[
        styles.root,
        styles[variant],
        localStyles.trigger,
        { height: inputSizes[size].height },
        isOpen && styles.focused,
        isInvalid && styles.invalid,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function SelectInput({ value, placeholder }: { value?: string; placeholder?: string }) {
  const { size } = useSelectContext();
  return (
    <Text
      isTruncated
      color={value ? "text" : "subtle"}
      style={[localStyles.input, { fontFamily: fonts.regular, fontSize: fontSizes[inputSizes[size].text] }]}
    >
      {value || placeholder}
    </Text>
  );
}

export function SelectIcon({ name, as, size = 20 }: { name?: IconName; as?: IconComponent; size?: number }) {
  return <Icon name={as ? undefined : (name ?? "chevronDown")} as={as} size={size} color="accent" />;
}

export function SelectPortal({ children }: { children?: ReactNode }) {
  const { isOpen, close } = useSelectContext();
  return (
    <Actionsheet isOpen={isOpen} onClose={close}>
      {children}
    </Actionsheet>
  );
}

export const SelectBackdrop = ActionsheetBackdrop;
export const SelectContent = ActionsheetContent;
export const SelectDragIndicator = ActionsheetDragIndicator;
export const SelectDragIndicatorWrapper = ActionsheetDragIndicatorWrapper;
export const SelectScrollView = ActionsheetScrollView;
export const SelectFlatList = ActionsheetFlatList;
export const SelectSectionHeaderText = ActionsheetSectionHeaderText;

export type SelectItemProps = {
  value: string;
  // A string, or custom content such as a Checkbox row
  label: ReactNode;
  // Overrides the default select-and-close, e.g. to toggle in a multi-select
  onPress?: () => void;
  isDisabled?: boolean;
};

export function SelectItem({ value, label, onPress, isDisabled }: SelectItemProps) {
  const { selectedValue, select } = useSelectContext();
  const selected = selectedValue === value;

  return (
    <ActionsheetItem
      accessibilityState={{ selected, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress ?? (() => select(value))}
      style={localStyles.item}
    >
      {isValidElement(label) ? (
        label
      ) : (
        <>
          <Text weight={selected ? "semiBold" : "regular"} color={selected ? "accent" : "text"}>
            {label}
          </Text>
          {selected && <Icon name="check" size={18} color="accent" />}
        </>
      )}
    </ActionsheetItem>
  );
}

const localStyles = StyleSheet.create({
  trigger: { justifyContent: "space-between", paddingRight: spacing[3] },
  input: { flex: 1, paddingHorizontal: spacing[4] },
  item: { justifyContent: "space-between" },
});
