import { DayLength, WORKOUT_LENGTH_MINUTES, WorkoutLength } from "@fit/shared";
import { Controller, useFormContext } from "react-hook-form";
import { ChoiceCards } from "@/components/choice-cards";
import { FormControl } from "@/components/form-control";
import { RHFHelperText, RHFLabel } from "@/components/hook-form";

const names: Record<DayLength, string> = { quick: "Quick", short: "Short", standard: "Standard", long: "Long" };

const minutes = (length: DayLength) => `${WORKOUT_LENGTH_MINUTES[length]} minutes`;

const optionsFor = <Length extends DayLength>(lengths: readonly Length[]) =>
  lengths.map((value) => ({ value, label: names[value], description: minutes(value), icon: "clock" as const }));

// The usual Lengths, for onboarding and Profile: Quick is only for one Workout
export const workoutLengthOptions = optionsFor(WorkoutLength.options);

// For one Workout, Quick included
export const dayLengthOptions = optionsFor(DayLength.options);

export const workoutLengthLabel = (length: DayLength) => `${names[length]} (${minutes(length)})`;

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
