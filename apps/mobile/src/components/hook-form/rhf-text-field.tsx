import { Controller, useFormContext } from "react-hook-form";
import type { TextInputProps } from "react-native";
import { FormControl } from "../form-control";
import type { InputSize } from "../input";
import { RHFHelperText } from "./rhf-helper-text";
import { RHFInput } from "./rhf-input";
import { RHFLabel } from "./rhf-label";

export type RHFTextFieldProps = Pick<
  TextInputProps,
  "autoCapitalize" | "autoComplete" | "keyboardType" | "placeholder" | "returnKeyType" | "onSubmitEditing"
> & {
  name: string;
  label?: string;
  helperText?: string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  numeric?: boolean;
  size?: InputSize;
};

export function RHFTextField({
  name,
  label,
  helperText,
  required = false,
  readOnly = false,
  disabled = false,
  ...inputProps
}: RHFTextFieldProps) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl isInvalid={!!fieldState.error} isReadOnly={readOnly} isDisabled={disabled} isRequired={required}>
          <RHFLabel label={label} />
          <RHFInput field={field} fieldState={fieldState} {...inputProps} />
          <RHFHelperText error={fieldState.error?.message} helperText={helperText} />
        </FormControl>
      )}
    />
  );
}
