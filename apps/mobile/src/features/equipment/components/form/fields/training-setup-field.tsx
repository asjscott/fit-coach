import { Controller, useFormContext } from "react-hook-form";
import { ChoiceCards } from "@/components/choice-cards";
import { FormControl } from "@/components/form-control";
import { RHFHelperText, RHFLabel } from "@/components/hook-form";
import type { IconName } from "@/components/icons";
import { TrainingSetup } from "@/features/equipment/training-setup";

const setupDetails: Record<TrainingSetup, { label: string; description: string; icon: IconName }> = {
  gym: { label: "Gym", description: "A commercial gym with a full range of equipment.", icon: "dumbbell" },
  home: { label: "Home", description: "Your own space, with whatever equipment you've got.", icon: "home" },
  bodyweight: { label: "Bodyweight only", description: "No weights, just you and maybe a bar or rings.", icon: "user" },
  none: { label: "No equipment", description: "Nothing at all, just you and some floor space.", icon: "circleX" },
};

export const trainingSetupOptions = TrainingSetup.options.map((value) => ({ value, ...setupDetails[value] }));

// Large cards rather than chips, so each setup can explain itself
export function TrainingSetupField({ label }: { label?: string }) {
  const { control } = useFormContext();
  return (
    <Controller
      name="trainingSetup"
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl isInvalid={!!error} isRequired>
          <RHFLabel label={label} />
          <ChoiceCards options={trainingSetupOptions} value={field.value} onChange={field.onChange} />
          <RHFHelperText error={error?.message} />
        </FormControl>
      )}
    />
  );
}
