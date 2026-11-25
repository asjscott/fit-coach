import { RPE_SCALE, type InProgressWorkoutExercise } from "@fit/shared";
import { StyleSheet } from "react-native";
import { Chip } from "@/components/chip";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { spacing } from "@/theme";
import { errorMessage } from "@/utils/error-message";
import { offersLastSetRpe, withRpe } from "../last-set-rpe";
import { useLogbook } from "../logbook-provider";

// The optional RPE for the Exercise's last Set so far (#133), when it's offered: one tap on a chip rates it, a tap on
// the chosen one takes it off, and logging on without one skips it
export function LastSetRpe({ workoutExercise }: { workoutExercise: InProgressWorkoutExercise }) {
  const { workout, editSet } = useLogbook();
  const { showToast } = useToast();
  const { id, sets } = workoutExercise;
  const set = sets.at(-1);
  if (!set || !workout || !offersLastSetRpe(workout, workoutExercise)) return null;

  const rate = async (rpe: number | undefined) => {
    try {
      await editSet(id, sets.length - 1, withRpe(set, rpe));
    } catch (err) {
      showToast(errorMessage(err), { error: err });
    }
  };

  return (
    <Stack spacing={2} style={styles.rpe}>
      <Text size="sm" color="muted">
        {`How hard was set ${sets.length}? Optional: 10 is no more reps`}
      </Text>
      <HStack spacing={2}>
        {RPE_SCALE.map((choice) => (
          <Chip
            key={choice}
            label={String(choice)}
            selected={set.rpe === choice}
            onPress={() => void rate(set.rpe === choice ? undefined : choice)}
          />
        ))}
      </HStack>
    </Stack>
  );
}

const styles = StyleSheet.create({ rpe: { marginTop: spacing[4] } });
