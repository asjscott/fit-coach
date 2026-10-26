import { createContext, use, type ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { spacing, useTheme, useThemedStyles, type SpaceToken } from "@/theme";
import { checkboxSizes, createCheckboxStyles, type CheckboxSize } from "../checkbox/styles";
import { useFormControlContext } from "../form-control";
import { Text, type TextProps } from "../text";

type GroupContextValue = { value?: string; onChange: (value: string) => void; isDisabled?: boolean };

const RadioGroupContext = createContext<GroupContextValue | null>(null);

type RadioContextValue = { isChecked: boolean; isInvalid: boolean; size: CheckboxSize };

const RadioContext = createContext<RadioContextValue | null>(null);

function useRadioContext() {
  const context = use(RadioContext);
  if (!context) throw new Error("Radio parts must be used inside <Radio>");
  return context;
}

export type RadioGroupProps = {
  value?: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
  space?: SpaceToken;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function RadioGroup({ value, onChange, isDisabled, space = 3, style, children }: RadioGroupProps) {
  return (
    <RadioGroupContext value={{ value, onChange, isDisabled }}>
      <View accessibilityRole="radiogroup" style={[{ gap: spacing[space] }, style]}>
        {children}
      </View>
    </RadioGroupContext>
  );
}

export type RadioProps = {
  value: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  size?: CheckboxSize;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Radio({ value, isDisabled, isInvalid, size = "md", style, children }: RadioProps) {
  const styles = useThemedStyles(createCheckboxStyles);
  const group = use(RadioGroupContext);
  if (!group) throw new Error("Radio must be used inside <RadioGroup>");
  const formControl = useFormControlContext();

  const checked = group.value === value;
  const disabled = isDisabled ?? group.isDisabled ?? formControl.isDisabled ?? false;
  const invalid = isInvalid ?? formControl.isInvalid ?? false;

  return (
    <RadioContext value={{ isChecked: checked, isInvalid: invalid, size }}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        onPress={() => group.onChange(value)}
        hitSlop={spacing[1]}
        style={[styles.root, disabled && styles.disabled, style]}
      >
        {children}
      </Pressable>
    </RadioContext>
  );
}

export function RadioIndicator({ children }: { children?: ReactNode }) {
  const styles = useThemedStyles(createCheckboxStyles);
  const { isChecked, isInvalid, size } = useRadioContext();
  const box = checkboxSizes[size].box;
  return (
    <View
      style={[
        styles.indicator,
        styles.round,
        { width: box, height: box },
        isChecked && styles.radioChecked,
        isInvalid && styles.invalid,
      ]}
    >
      {children}
    </View>
  );
}

// Filled dot, only visible while selected
export function RadioIcon() {
  const { colors } = useTheme();
  const { isChecked, size } = useRadioContext();
  if (!isChecked) return null;
  const dot = checkboxSizes[size].box / 2;
  return <View style={{ width: dot, height: dot, borderRadius: dot, backgroundColor: colors.accent }} />;
}

export function RadioLabel(props: TextProps) {
  const { size } = useRadioContext();
  return <Text size={checkboxSizes[size].text} {...props} />;
}
