import { WORKOUT_LENGTH_MINUTES, WorkoutLength } from "@fit/shared";
import { Controller, useFormContext } from "react-hook-form";
import { ChoiceCards } from "@/components/choice-cards";
import { FormControl } from "@/components/form-control";
import { RHFHelperText, RHFLabel } from "@/components/hook-form";

const names: Record<WorkoutLength, string> = { short: "Short", standard: "Standard", long: "Long" };

const minutes = (length: WorkoutLength) => `${WORKOUT_LENGTH_MINUTES[length]} minutes`;

export const workoutLengthOptions = WorkoutLength.options.map((value) => ({
  value,
  label: names[value],
  description: minutes(value),
  icon: "clock" as const,
}));

export const workoutLengthLabel = (length: WorkoutLength) => `${names[length]} (${minutes(length)})`;

export function UserWorkoutLengthField({ label = "Workout Length" }: { label?: string }) {
  const { control } = useFormContext();
  return (
    <Controller
      name="workoutLength"
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl isInvalid={!!error} isRequired>
          <RHFLabel label={label} />
          <ChoiceCards options={workoutLengthOptions} value={field.value} onChange={field.onChange} />
          <RHFHelperText error={error && "Choose a Workout Length"} />
        </FormControl>
      )}
    />
  );
}
