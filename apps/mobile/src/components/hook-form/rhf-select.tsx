import { Controller, useFormContext } from "react-hook-form";
import { FormControl } from "../form-control";
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectScrollView,
  SelectTrigger,
} from "../select";
import { RHFHelperText } from "./rhf-helper-text";
import { RHFLabel } from "./rhf-label";
import type { Option, RHFFieldProps } from "./types";

export type RHFSelectProps = RHFFieldProps & { options: Option[]; placeholder?: string };

export function RHFSelect({
  name,
  label,
  helperText,
  required,
  readOnly,
  disabled,
  options,
  placeholder = "Select option",
}: RHFSelectProps) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selectedOption = options.find((o) => o.value === field.value);
        return (
          <FormControl isInvalid={!!error} isReadOnly={readOnly} isDisabled={disabled} isRequired={required}>
            <RHFLabel label={label} />
            <Select selectedValue={field.value ?? null} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectInput value={selectedOption?.label} placeholder={placeholder} />
                <SelectIcon />
              </SelectTrigger>
              <SelectPortal>
                <SelectBackdrop />
                <SelectContent>
                  <SelectDragIndicatorWrapper>
                    <SelectDragIndicator />
                  </SelectDragIndicatorWrapper>
                  <SelectScrollView>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value} label={option.label} />
                    ))}
                  </SelectScrollView>
                </SelectContent>
              </SelectPortal>
            </Select>
            <RHFHelperText error={error?.message} helperText={helperText} />
          </FormControl>
        );
      }}
    />
  );
}
