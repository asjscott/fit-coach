import { Controller, useFormContext } from "react-hook-form";
import { Checkbox, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from "../checkbox";
import { FormControl, FormControlRow } from "../form-control";
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

export type RHFMultiSelectProps = RHFFieldProps & { options: Option[]; placeholder?: string; inline?: boolean };

const MAX_CHARS = 30;
const MAX_ITEMS = 2;

// "Knee, Ankle +2 more"
function getDisplayLabel(selected: string[], options: Option[]) {
  const labels = options.filter((o) => selected.includes(o.value)).map((o) => o.label);
  const displayed: string[] = [];
  let totalLength = 0;

  for (const label of labels) {
    const truncated = label.length > MAX_CHARS ? `${label.slice(0, MAX_CHARS)}...` : label;
    const addedLength = displayed.length > 0 ? truncated.length + 2 : truncated.length;
    if (displayed.length >= MAX_ITEMS || totalLength + addedLength > MAX_CHARS) break;
    displayed.push(truncated);
    totalLength += addedLength;
  }

  const remaining = labels.length - displayed.length;
  return remaining > 0 ? `${displayed.join(", ")} +${remaining} more` : displayed.join(", ");
}

export function RHFMultiSelect({
  name,
  label,
  helperText,
  required,
  readOnly,
  disabled,
  options,
  placeholder = "Select options",
  inline,
}: RHFMultiSelectProps) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selected: string[] = field.value ?? [];
        const toggle = (value: string) =>
          field.onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

        return (
          <FormControl
            isInvalid={!!error}
            isReadOnly={readOnly}
            isDisabled={disabled}
            isRequired={required}
            inline={inline}
          >
            <FormControlRow>
              <RHFLabel label={label} />
              <Select>
                <SelectTrigger>
                  <SelectInput value={getDisplayLabel(selected, options)} placeholder={placeholder} />
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
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          // Toggle without closing so several can be picked
                          onPress={() => toggle(option.value)}
                          label={
                            <Checkbox isChecked={selected.includes(option.value)} onChange={() => toggle(option.value)}>
                              <CheckboxIndicator>
                                <CheckboxIcon />
                              </CheckboxIndicator>
                              <CheckboxLabel>{option.label}</CheckboxLabel>
                            </Checkbox>
                          }
                        />
                      ))}
                    </SelectScrollView>
                  </SelectContent>
                </SelectPortal>
              </Select>
            </FormControlRow>
            <RHFHelperText error={error?.message} helperText={helperText} />
          </FormControl>
        );
      }}
    />
  );
}
