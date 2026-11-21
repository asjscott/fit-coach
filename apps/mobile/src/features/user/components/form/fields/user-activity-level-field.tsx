import { ActivityLevel } from "@fit/shared";
import { Controller, useFormContext } from "react-hook-form";
import { ChoiceCards, type ChoiceCardOption } from "@/components/choice-cards";
import { FormControl } from "@/components/form-control";
import { RHFHelperText, RHFLabel } from "@/components/hook-form";

// Each described by job and daily steps (spec #158 story 1). It covers daily life and strength Workouts, never
// Activities, which M10 credits on their own
const activityLevelDetails: Record<ActivityLevel, Omit<ChoiceCardOption<ActivityLevel>, "value">> = {
  sedentary: {
    label: "Sedentary",
    description: "A desk job, and under 5,000 steps a day.",
    icon: "home",
  },
  lightly_active: {
    label: "Lightly active",
    description: "Mostly sitting with some walking, 5,000 to 7,500 steps a day.",
    icon: "clock",
  },
  active: {
    label: "Active",
    description: "On your feet much of the day, as a teacher or in retail, 7,500 to 10,000 steps.",
    icon: "flame",
  },
  very_active: {
    label: "Very active",
    description: "Physical work, such as building or a warehouse, over 10,000 steps a day.",
    icon: "dumbbell",
  },
};

export const activityLevelOptions = ActivityLevel.options.map((value) => ({ value, ...activityLevelDetails[value] }));

export const activityLevelLabel = (level: ActivityLevel) => activityLevelDetails[level].label;

// What the Activity Level counts, said wherever it's asked
export const ACTIVITY_LEVEL_NOTE = "Count your daily life and your strength Workouts, but not runs or rides.";

export function UserActivityLevelField({ label }: { label?: string }) {
  const { control } = useFormContext();
  return (
    <Controller
      name="activityLevel"
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl isInvalid={!!error} isRequired>
          <RHFLabel label={label} />
          <ChoiceCards options={activityLevelOptions} value={field.value} onChange={field.onChange} />
          <RHFHelperText error={error && "Choose how active you are"} />
        </FormControl>
      )}
    />
  );
}
