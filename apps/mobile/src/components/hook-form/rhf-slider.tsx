import { Controller, useFormContext } from "react-hook-form";
import { FormControl } from "../form-control";
import { Slider, SliderFilledTrack, SliderThumb, SliderTrack } from "../slider";
import { HStack } from "../stack";
import { Text } from "../text";
import { RHFHelperText } from "./rhf-helper-text";
import { RHFLabel } from "./rhf-label";
import type { RHFFieldProps } from "./types";

export type RHFSliderProps = RHFFieldProps & {
  min: number;
  max: number;
  step?: number;
  // Shown beside the label, e.g. (v) => `${v} days`
  formatValue?: (value: number) => string;
};

export function RHFSlider({
  name,
  label,
  helperText,
  required,
  readOnly,
  disabled,
  min,
  max,
  step = 1,
  formatValue = String,
}: RHFSliderProps) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl isInvalid={!!error} isDisabled={disabled || readOnly} isRequired={required}>
          <HStack justify="between">
            <RHFLabel label={label} />
            <Text weight="semiBold" color="accent">
              {formatValue(field.value ?? min)}
            </Text>
          </HStack>
          <Slider
            value={field.value ?? min}
            onChange={field.onChange}
            onChangeEnd={field.onBlur}
            minValue={min}
            maxValue={max}
            step={step}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
          <RHFHelperText error={error?.message} helperText={helperText} />
        </FormControl>
      )}
    />
  );
}
