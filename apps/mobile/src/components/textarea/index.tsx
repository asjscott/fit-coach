import { createContext, use, useId, useState, type ReactNode } from "react";
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { fonts, fontSizes, radii, spacing, useTheme, useThemedStyles, type Colors, type FontSize } from "@/theme";
import { useFormControlContext } from "../form-control";
import { KeyboardDoneBar } from "../input-accessory-view";

type TextareaSize = "sm" | "md" | "lg" | "xl";

const textSize: Record<TextareaSize, FontSize> = { sm: "sm", md: "md", lg: "lg", xl: "xl" };

type TextareaContextValue = {
  size: TextareaSize;
  editable: boolean;
  setFocused: (focused: boolean) => void;
};

const TextareaContext = createContext<TextareaContextValue | null>(null);

export type TextareaProps = {
  size?: TextareaSize;
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Textarea({ size = "md", isInvalid, isDisabled, isReadOnly, style, children }: TextareaProps) {
  const styles = useThemedStyles(createStyles);
  const formControl = useFormControlContext();
  const [focused, setFocused] = useState(false);
  const invalid = isInvalid ?? formControl.isInvalid;
  const disabled = isDisabled ?? formControl.isDisabled;
  const readOnly = isReadOnly ?? formControl.isReadOnly;

  return (
    <TextareaContext value={{ size, editable: !disabled && !readOnly, setFocused }}>
      <View
        style={[styles.root, focused && styles.focused, invalid && styles.invalid, disabled && styles.disabled, style]}
      >
        {children}
      </View>
    </TextareaContext>
  );
}

export function TextareaInput({ style, onFocus, onBlur, ...props }: TextInputProps) {
  const { colors, scheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const context = use(TextareaContext);
  if (!context) throw new Error("TextareaInput must be used inside <Textarea>");
  const accessoryId = useId();

  return (
    <>
      <TextInput
        multiline
        textAlignVertical="top"
        editable={context.editable}
        placeholderTextColor={colors.textSubtle}
        selectionColor={colors.orange}
        keyboardAppearance={scheme}
        inputAccessoryViewID={accessoryId}
        onFocus={(e) => {
          context.setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          context.setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, { fontFamily: fonts.regular, fontSize: fontSizes[textSize[context.size]] }, style]}
        {...props}
      />
      <KeyboardDoneBar nativeID={accessoryId} />
    </>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    root: {
      height: 100,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
    },
    focused: { borderColor: colors.orange },
    invalid: { borderColor: colors.danger },
    disabled: { opacity: 0.4 },
    input: { flex: 1, color: colors.text, padding: spacing[3] },
  });
