import { RHFTextField, type RHFTextFieldProps } from "@/components/hook-form";

export function UserHeightField(props: Partial<RHFTextFieldProps>) {
  return <RHFTextField name="heightCm" label="Height (cm)" numeric required {...props} />;
}
