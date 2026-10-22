import { Controller, useFormContext } from "react-hook-form";
import { FormControl } from "../form-control";
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from "../radio";
import { RHFHelperText } from "./rhf-helper-text";
import { RHFLabel } from "./rhf-label";
import type { Option, RHFFieldProps } from "./types";

export function RHFRadioGroup({
  name,
  label,
  helperText,
  required,
  readOnly,
  disabled,
  options,
}: RHFFieldProps & { options: Option[] }) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl isInvalid={!!error} isReadOnly={readOnly} isDisabled={disabled || readOnly} isRequired={required}>
          <RHFLabel label={label} />
          <RadioGroup value={field.value} onChange={field.onChange}>
            {options.map((option) => (
              <Radio key={option.value} value={option.value}>
                <RadioIndicator>
                  <RadioIcon />
                </RadioIndicator>
                <RadioLabel>{option.label}</RadioLabel>
              </Radio>
            ))}
          </RadioGroup>
          <RHFHelperText error={error?.message} helperText={helperText} />
        </FormControl>
      )}
    />
  );
}
