import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { FormControl } from "../form-control";
import { InputIcon, InputSlot } from "../input";
import { RHFHelperText } from "./rhf-helper-text";
import { RHFInput } from "./rhf-input";
import { RHFLabel } from "./rhf-label";
import type { RHFTextFieldProps } from "./rhf-text-field";

export function RHFPasswordField({
  name,
  label,
  helperText,
  required = false,
  readOnly = false,
  disabled = false,
  ...inputProps
}: Omit<RHFTextFieldProps, "numeric">) {
  const { control } = useFormContext();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl isInvalid={!!fieldState.error} isReadOnly={readOnly} isDisabled={disabled} isRequired={required}>
          <RHFLabel label={label} />
          <RHFInput
            field={field}
            fieldState={fieldState}
            type={showPassword ? "text" : "password"}
            autoComplete="password"
            rightSlot={
              <InputSlot
                onPress={() => setShowPassword((shown) => !shown)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <InputIcon name={showPassword ? "eye" : "eyeClosed"} />
              </InputSlot>
            }
            {...inputProps}
          />
          <RHFHelperText error={fieldState.error?.message} helperText={helperText} />
        </FormControl>
      )}
    />
  );
}
