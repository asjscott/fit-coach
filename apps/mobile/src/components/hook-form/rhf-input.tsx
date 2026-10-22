import type { ReactNode } from "react";
import type { ControllerFieldState, ControllerRenderProps, FieldValues } from "react-hook-form";
import type { TextInputProps } from "react-native";
import { Input, InputField, type InputSize } from "../input";

export type RHFInputProps = Pick<
  TextInputProps,
  "autoCapitalize" | "autoComplete" | "keyboardType" | "placeholder" | "returnKeyType" | "onSubmitEditing"
> & {
  field: ControllerRenderProps<FieldValues, string>;
  fieldState: ControllerFieldState;
  type?: "text" | "password";
  // Store the value as a number (empty -> undefined) for numeric schema fields
  numeric?: boolean;
  size?: InputSize;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
};

// Text-like characters a number field can pass through while the user is still typing
const isPartialNumber = (text: string) => text.endsWith(".") || text === "-";

export function RHFInput({
  field,
  fieldState,
  type = "text",
  numeric = false,
  size = "lg",
  leftSlot,
  rightSlot,
  autoCapitalize = "none",
  autoComplete = "off",
  keyboardType,
  ...props
}: RHFInputProps) {
  const handleChange = (text: string) => {
    if (!numeric) return field.onChange(text);
    if (text === "") return field.onChange(undefined);
    const parsed = Number(text);
    field.onChange(Number.isFinite(parsed) && !isPartialNumber(text) ? parsed : text);
  };

  return (
    <Input size={size} isInvalid={!!fieldState.error}>
      {leftSlot}
      <InputField
        ref={field.ref}
        type={type}
        value={field.value == null ? "" : String(field.value)}
        onChangeText={handleChange}
        onBlur={field.onBlur}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        keyboardType={keyboardType ?? (numeric ? "decimal-pad" : "default")}
        {...props}
      />
      {rightSlot}
    </Input>
  );
}
