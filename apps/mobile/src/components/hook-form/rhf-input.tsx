import type { ReactNode } from "react";
import type { ControllerFieldState, ControllerRenderProps, FieldValues } from "react-hook-form";
import type { TextInputProps } from "react-native";
import { Input, InputField, type InputSize } from "../input";
import { numberFieldValue } from "./number-field";

export type RHFInputProps = Pick<
  TextInputProps,
  "autoCapitalize" | "autoComplete" | "keyboardType" | "placeholder" | "returnKeyType" | "onSubmitEditing"
> & {
  field: ControllerRenderProps<FieldValues, string>;
  fieldState: ControllerFieldState;
  type?: "text" | "password";
  // Store the value as a number (empty -> null) for numeric schema fields
  numeric?: boolean;
  size?: InputSize;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
};

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
  const handleChange = (text: string) => field.onChange(numeric ? numberFieldValue(text) : text);

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
