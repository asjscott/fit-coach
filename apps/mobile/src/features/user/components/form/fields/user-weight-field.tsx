import { RHFTextField, type RHFTextFieldProps } from "@/components/hook-form";
import { useWeightUnit } from "@/features/user/current-user-provider";

// Body weight, asked in the user's unit (#148)
export function UserWeightField(props: Partial<RHFTextFieldProps>) {
  const unit = useWeightUnit();
  return <RHFTextField name="weight" label={`Weight (${unit})`} numeric required {...props} />;
}
