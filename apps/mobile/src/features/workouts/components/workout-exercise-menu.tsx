import type { InProgressWorkoutExercise } from "@fit/shared";
import { useState } from "react";
import { ConfirmModal } from "@/components/choice-modal";
import { OverflowMenu } from "@/components/overflow-menu";
import { useToast } from "@/contexts/toast-context";
import { errorMessage } from "@/utils/error-message";
import { exerciseName } from "../library";
import { useLogbook } from "../logbook-provider";

export type WorkoutExerciseMenuProps = {
  workoutExercise: InProgressWorkoutExercise;
};

// A Workout Exercise's ⋯ menu: delete it, always confirming first. None in an Assessment Workout, whose Exercises
// can't be changed
export function WorkoutExerciseMenu(props: WorkoutExerciseMenuProps) {
  const { workout } = useLogbook();
  return workout?.assessment ? null : <Menu {...props} />;
}

function Menu({ workoutExercise }: WorkoutExerciseMenuProps) {
  const { removeWorkoutExercise } = useLogbook();
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const { id, slug, sets } = workoutExercise;
  const name = exerciseName(slug);

  return (
    <>
      <OverflowMenu
        label={`${name} actions`}
        items={[{ label: "Delete exercise", icon: "trash", destructive: true, onPress: () => setConfirming(true) }]}
      />
      <ConfirmModal
        isOpen={confirming}
        title={`Delete ${name}?`}
        message={
          sets.length === 0
            ? "It has no Sets yet."
            : `Its ${sets.length === 1 ? "Set" : `${sets.length} Sets`} will be deleted too.`
        }
        confirmLabel="Delete"
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false);
          try {
            await removeWorkoutExercise(id);
          } catch (err) {
            showToast(errorMessage(err), { error: err });
          }
        }}
      />
    </>
  );
}
