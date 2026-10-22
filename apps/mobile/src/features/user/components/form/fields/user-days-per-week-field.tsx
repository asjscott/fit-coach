import { Controller, useFormContext } from "react-hook-form";
import { Button, ButtonText } from "@/components/button";
import { FormControl } from "@/components/form-control";
import { RHFHelperText, RHFLabel } from "@/components/hook-form";
import { HStack } from "@/components/stack";

export const daysPerWeekOptions = [2, 3, 4, 5, 6] as const;

export function UserDaysPerWeekField({ label = "Days per week" }: { label?: string }) {
  const { control } = useFormContext();
  return (
    <Controller
      name="daysPerWeek"
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl isInvalid={!!error} isRequired>
          <RHFLabel label={label} />
          <HStack spacing={2}>
            {daysPerWeekOptions.map((days) => (
              <Button
                key={days}
                action={field.value === days ? "primary" : "secondary"}
                accessibilityState={{ selected: field.value === days }}
                onPress={() => field.onChange(days)}
                style={{ flex: 1 }}
              >
                <ButtonText>{days}</ButtonText>
              </Button>
            ))}
          </HStack>
          <RHFHelperText error={error?.message} />
        </FormControl>
      )}
    />
  );
}
