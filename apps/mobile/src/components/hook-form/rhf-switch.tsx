import { Controller, useFormContext } from "react-hook-form";
import { FormControl } from "../form-control";
import { HStack } from "../stack";
import { Switch } from "../switch";
import { Text } from "../text";
import { RHFHelperText } from "./rhf-helper-text";
import type { RHFFieldProps } from "./types";

// Label sits beside the switch, the usual settings-row layout
export function RHFSwitch({ name, label, helperText, required, readOnly, disabled }: RHFFieldProps) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl isInvalid={!!error} isReadOnly={readOnly} isDisabled={disabled} isRequired={required}>
          <HStack justify="between">
            <Text style={{ flex: 1 }}>{label}</Text>
            <Switch value={!!field.value} onValueChange={field.onChange} />
          </HStack>
          <RHFHelperText error={error?.message} helperText={helperText} />
        </FormControl>
      )}
    />
  );
}
