import { RHFTextField, type RHFTextFieldProps } from "@/components/hook-form";

export function UserBirthYearField(props: Partial<RHFTextFieldProps>) {
  return (
    <RHFTextField
      name="birthYear"
      label="Birth year"
      placeholder="e.g. 1990"
      keyboardType="number-pad"
      numeric
      required
      {...props}
    />
  );
}
