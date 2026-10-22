import { Controller, useFormContext } from "react-hook-form";
import { Chip } from "../chip";
import { FormControl } from "../form-control";
import { Stack } from "../stack";
import { RHFHelperText } from "./rhf-helper-text";
import { RHFLabel } from "./rhf-label";
import type { Option, RHFFieldProps } from "./types";

export type RHFChipSelectProps = RHFFieldProps & {
  options: Option[];
  // Single value instead of an array
  single?: boolean;
};

// All options visible as tappable chips; better than a dropdown for short lists
export function RHFChipSelect({
  name,
  label,
  helperText,
  required,
  readOnly,
  disabled,
  options,
  single = false,
}: RHFChipSelectProps) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selected: string[] = single ? (field.value ? [field.value] : []) : (field.value ?? []);
        const toggle = (value: string) => {
          if (single) return field.onChange(value);
          field.onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
        };

        return (
          <FormControl isInvalid={!!error} isReadOnly={readOnly} isDisabled={disabled} isRequired={required}>
            <RHFLabel label={label} />
            <Stack direction="row" wrap="wrap" spacing={2}>
              {options.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={selected.includes(option.value)}
                  onPress={() => toggle(option.value)}
                  disabled={disabled || readOnly}
                />
              ))}
            </Stack>
            <RHFHelperText error={error?.message} helperText={helperText} />
          </FormControl>
        );
      }}
    />
  );
}
