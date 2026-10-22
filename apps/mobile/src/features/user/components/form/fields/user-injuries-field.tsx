import { InjuryTag } from "@fit/shared";
import { Controller, useFormContext } from "react-hook-form";
import { Chip } from "@/components/chip";
import { FormControl } from "@/components/form-control";
import { Grid, GridItem } from "@/components/grid";
import { RHFHelperText, RHFLabel, type Option } from "@/components/hook-form";

const injuryLabels: Record<InjuryTag, string> = {
  neck: "Neck",
  shoulder: "Shoulder",
  elbow: "Elbow",
  wrist: "Wrist",
  lower_back: "Lower back",
  hip: "Hip",
  knee: "Knee",
  ankle: "Ankle",
};

export const injuryOptions: Option<InjuryTag>[] = InjuryTag.options.map((value) => ({
  value,
  label: injuryLabels[value],
}));

export const injuryLabel = (injury: InjuryTag) => injuryLabels[injury];

// undefined = not answered yet; [] = "None" chosen
export function UserInjuriesField({ label }: { label?: string }) {
  const { control } = useFormContext();
  return (
    <Controller
      name="injuries"
      control={control}
      render={({ field, fieldState: { error } }) => {
        const value: InjuryTag[] | undefined = field.value;
        const toggle = (injury: InjuryTag) => {
          const current = value ?? [];
          field.onChange(current.includes(injury) ? current.filter((i) => i !== injury) : [...current, injury]);
        };

        return (
          <FormControl isInvalid={!!error} isRequired>
            <RHFLabel label={label} />
            <Grid columns={2} gap={2}>
              {injuryOptions.map((option) => (
                <GridItem key={option.value}>
                  <Chip
                    label={option.label}
                    selected={!!value?.includes(option.value)}
                    onPress={() => toggle(option.value)}
                  />
                </GridItem>
              ))}
              <GridItem span={2}>
                <Chip label="None" selected={value?.length === 0} onPress={() => field.onChange([])} />
              </GridItem>
            </Grid>
            <RHFHelperText error={error?.message} />
          </FormControl>
        );
      }}
    />
  );
}
