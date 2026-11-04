import { Goal } from "@fit/shared";
import { Controller, useFormContext } from "react-hook-form";
import { ChoiceCards } from "@/components/choice-cards";
import { FormControl } from "@/components/form-control";
import { RHFHelperText, RHFLabel } from "@/components/hook-form";
import type { IconName } from "@/components/icons";

const goalDetails: Record<Goal, { label: string; description: string; icon: IconName }> = {
  lose_fat: { label: "Lose fat", description: "Drop body fat while holding on to strength.", icon: "flame" },
  build_muscle: { label: "Build muscle", description: "Add size with higher-volume training.", icon: "dumbbell" },
  recomp: { label: "Recomp", description: "Lose fat and gain muscle at the same time.", icon: "weight" },
  athletic: { label: "Athletic", description: "Get faster, more powerful and better conditioned.", icon: "target" },
};

export const goalOptions = Goal.options.map((value) => ({ value, ...goalDetails[value] }));

export const goalLabel = (goal: Goal) => goalDetails[goal].label;

// Large cards rather than a dropdown, so each goal can explain itself
export function UserGoalField({ label }: { label?: string }) {
  const { control } = useFormContext();
  return (
    <Controller
      name="goal"
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl isInvalid={!!error} isRequired>
          <RHFLabel label={label} />
          <ChoiceCards options={goalOptions} value={field.value} onChange={field.onChange} />
          <RHFHelperText error={error && "Choose a goal"} />
        </FormControl>
      )}
    />
  );
}
