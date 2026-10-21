import { useId, useState } from "react";
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { radii, spacing, textVariants, useTheme, useThemedStyles, type Colors } from "@/theme";
import { Text } from "./Text";

export type TextFieldProps = TextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
};

export function TextField({ label, helper, error, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors, scheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [focused, setFocused] = useState(false);
  // iOS number pads have no return key, so give every field a "Done" bar above the keyboard
  const accessoryId = useId();
  const showDoneBar = Platform.OS === "ios";

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="label" color="textMuted">
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={colors.textSubtle}
        selectionColor={colors.orange}
        keyboardAppearance={scheme}
        inputAccessoryViewID={showDoneBar ? accessoryId : undefined}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, focused && styles.focused, !!error && styles.errored, style]}
        {...rest}
      />
      {(error || helper) && (
        <Text variant="caption" color={error ? "danger" : "textSubtle"}>
          {error ?? helper}
        </Text>
      )}
      {showDoneBar && (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={styles.doneBar}>
            <Pressable onPress={Keyboard.dismiss} hitSlop={spacing.sm} accessibilityRole="button">
              <Text variant="label" color="orange">
                Done
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { gap: spacing.xs },
    input: {
      ...textVariants.body,
      color: colors.text,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      height: 52,
    },
    focused: { borderColor: colors.orange },
    errored: { borderColor: colors.danger },
    doneBar: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surfaceRaised,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });
