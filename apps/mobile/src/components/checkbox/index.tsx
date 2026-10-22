import { createContext, use, type ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { spacing, useTheme, useThemedStyles, type SpaceToken } from "@/theme";
import { useFormControlContext } from "../form-control";
import { Icon, type IconComponent } from "../icons";
import { Text, type TextProps } from "../text";
import { checkboxSizes, createCheckboxStyles, type CheckboxSize } from "./styles";

type GroupContextValue = { value: string[]; toggle: (value: string) => void; isDisabled?: boolean };

const CheckboxGroupContext = createContext<GroupContextValue | null>(null);

type CheckboxContextValue = { isChecked: boolean; isInvalid: boolean; size: CheckboxSize };

const CheckboxContext = createContext<CheckboxContextValue | null>(null);

function useCheckboxContext() {
  const context = use(CheckboxContext);
  if (!context) throw new Error("Checkbox parts must be used inside <Checkbox>");
  return context;
}

export type CheckboxGroupProps = {
  value: string[];
  onChange: (value: string[]) => void;
  isDisabled?: boolean;
  space?: SpaceToken;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function CheckboxGroup({ value, onChange, isDisabled, space = 3, style, children }: CheckboxGroupProps) {
  const toggle = (item: string) =>
    onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item]);

  return (
    <CheckboxGroupContext value={{ value, toggle, isDisabled }}>
      <View style={[{ gap: spacing[space] }, style]}>{children}</View>
    </CheckboxGroupContext>
  );
}

export type CheckboxProps = {
  // Required inside a CheckboxGroup
  value?: string;
  isChecked?: boolean;
  onChange?: (isChecked: boolean) => void;
  isDisabled?: boolean;
  isInvalid?: boolean;
  size?: CheckboxSize;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Checkbox({
  value,
  isChecked,
  onChange,
  isDisabled,
  isInvalid,
  size = "md",
  style,
  children,
}: CheckboxProps) {
  const styles = useThemedStyles(createCheckboxStyles);
  const group = use(CheckboxGroupContext);
  const formControl = useFormControlContext();

  const checked = group && value !== undefined ? group.value.includes(value) : !!isChecked;
  const disabled = isDisabled ?? group?.isDisabled ?? formControl.isDisabled ?? false;
  const invalid = isInvalid ?? formControl.isInvalid ?? false;

  const handlePress = () => {
    if (group && value !== undefined) group.toggle(value);
    onChange?.(!checked);
  };

  return (
    <CheckboxContext value={{ isChecked: checked, isInvalid: invalid, size }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        onPress={handlePress}
        hitSlop={spacing[1]}
        style={[styles.root, disabled && styles.disabled, style]}
      >
        {children}
      </Pressable>
    </CheckboxContext>
  );
}

export function CheckboxIndicator({ children }: { children?: ReactNode }) {
  const styles = useThemedStyles(createCheckboxStyles);
  const { isChecked, isInvalid, size } = useCheckboxContext();
  const box = checkboxSizes[size].box;
  return (
    <View
      style={[
        styles.indicator,
        { width: box, height: box },
        isChecked && styles.checked,
        isInvalid && styles.invalid,
      ]}
    >
      {children}
    </View>
  );
}

// Only visible while checked
export function CheckboxIcon({ as }: { as?: IconComponent }) {
  const { colors } = useTheme();
  const { isChecked, size } = useCheckboxContext();
  if (!isChecked) return null;
  return (
    <Icon
      as={as}
      name={as ? undefined : "check"}
      size={checkboxSizes[size].icon}
      rawColor={colors.onAccent}
      strokeWidth={3}
    />
  );
}

export function CheckboxLabel(props: TextProps) {
  const { size } = useCheckboxContext();
  return <Text size={checkboxSizes[size].text} {...props} />;
}
