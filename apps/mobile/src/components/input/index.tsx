import { createContext, use, useId, useState, type ReactNode, type Ref } from "react";
import {
  Platform,
  Pressable,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { fonts, fontSizes, useTheme, useThemedStyles } from "@/theme";
import { useFormControlContext } from "../form-control";
import { Icon, type IconComponent, type IconName } from "../icons";
import { KeyboardDoneBar } from "../input-accessory-view";
import { TABULAR } from "../text";
import { createInputStyles, inputSizes, type InputSize, type InputVariant } from "./styles";

type InputContextValue = {
  variant: InputVariant;
  size: InputSize;
  isDisabled: boolean;
  isReadOnly: boolean;
  setFocused: (focused: boolean) => void;
};

const InputContext = createContext<InputContextValue | null>(null);

function useInputContext() {
  const context = use(InputContext);
  if (!context) throw new Error("Input parts must be used inside <Input>");
  return context;
}

export type InputProps = {
  variant?: InputVariant;
  size?: InputSize;
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Input({
  variant = "outline",
  size = "lg",
  isInvalid,
  isDisabled,
  isReadOnly,
  style,
  children,
}: InputProps) {
  const styles = useThemedStyles(createInputStyles);
  const formControl = useFormControlContext();
  const [focused, setFocused] = useState(false);

  const invalid = isInvalid ?? formControl.isInvalid ?? false;
  const disabled = isDisabled ?? formControl.isDisabled ?? false;
  const readOnly = isReadOnly ?? formControl.isReadOnly ?? false;

  return (
    <InputContext value={{ variant, size, isDisabled: disabled, isReadOnly: readOnly, setFocused }}>
      <View
        style={[
          styles.root,
          styles[variant],
          { height: inputSizes[size].height },
          focused && styles.focused,
          invalid && styles.invalid,
          disabled && styles.disabled,
          style,
        ]}
      >
        {children}
      </View>
    </InputContext>
  );
}

export type InputFieldProps = TextInputProps & { type?: "text" | "password"; ref?: Ref<TextInput> };

export function InputField({ type = "text", style, onFocus, onBlur, ...props }: InputFieldProps) {
  const { colors, scheme } = useTheme();
  const styles = useThemedStyles(createInputStyles);
  const { variant, size, isDisabled, isReadOnly, setFocused } = useInputContext();
  const accessoryId = useId();

  return (
    <>
      <TextInput
        editable={!isDisabled && !isReadOnly}
        secureTextEntry={type === "password"}
        placeholderTextColor={colors.subtle}
        selectionColor={colors.accent}
        keyboardAppearance={scheme}
        inputAccessoryViewID={accessoryId}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.field,
          variant === "underlined" && styles.fieldUnderlined,
          { fontFamily: fonts.regular, fontSize: fontSizes[inputSizes[size].text], fontVariant: TABULAR },
          // The root's accent border shows focus, so the browser's outline would draw a second one
          Platform.OS === "web" && { outlineWidth: 0 },
          style,
        ]}
        {...props}
      />
      <KeyboardDoneBar nativeID={accessoryId} />
    </>
  );
}

export function InputSlot({ style, ...props }: PressableProps & { style?: StyleProp<ViewStyle> }) {
  const styles = useThemedStyles(createInputStyles);
  return <Pressable style={[styles.slot, style]} {...props} />;
}

export function InputIcon({ name, as, size }: { name?: IconName; as?: IconComponent; size?: number }) {
  const context = useInputContext();
  return <Icon name={name} as={as} size={size ?? inputSizes[context.size].icon} color="subtle" />;
}
export type { InputSize, InputVariant } from "./styles";
