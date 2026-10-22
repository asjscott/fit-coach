import { RHFTextField, type RHFTextFieldProps } from "@/components/hook-form";

export function UserWeightField(props: Partial<RHFTextFieldProps>) {
  return <RHFTextField name="weightKg" label="Weight (kg)" numeric required {...props} />;
}
