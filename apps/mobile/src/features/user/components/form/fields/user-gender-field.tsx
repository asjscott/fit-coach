import type { UserProfile } from "@fit/shared";
import { RHFChipSelect, type Option, type RHFChipSelectProps } from "@/components/hook-form";

export const genderOptions: Option<UserProfile["gender"]>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export const genderLabel = (gender: UserProfile["gender"]) => genderOptions.find((o) => o.value === gender)?.label;

export function UserGenderField(props: Partial<RHFChipSelectProps>) {
  return <RHFChipSelect name="gender" label="Gender" options={genderOptions} single required {...props} />;
}
