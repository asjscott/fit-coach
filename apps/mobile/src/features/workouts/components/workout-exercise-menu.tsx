import type { InProgressWorkoutExercise } from "@fit/shared";
import { useState } from "react";
import { ConfirmModal } from "@/components/choice-modal";
import { OverflowMenu, type OverflowMenuItem } from "@/components/overflow-menu";
import { useToast } from "@/contexts/toast-context";
import { errorMessage } from "@/utils/error-message";
import { exerciseName } from "../library";
import { useLogbook } from "../logbook-provider";

export type WorkoutExerciseMenuProps = {
  workoutExercise: InProgressWorkoutExercise;
  // Its place in the Workout, from 0, and how many there are
  position: number;
  count: number;
};

// A Workout Exercise's ⋯ menu: move it up or down, or remove it (confirming first when it has Sets). None in an
// Assessment Workout, whose Exercises can't be changed
export function WorkoutExerciseMenu(props: WorkoutExerciseMenuProps) {
  const { workout } = useLogbook();
  return workout?.assessment ? null : <Menu {...props} />;
}

function Menu({ workoutExercise, position, count }: WorkoutExerciseMenuProps) {
  const { moveWorkoutExercise, removeWorkoutExercise } = useLogbook();
  const { showToast } = useToast();
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const { id, slug, sets } = workoutExercise;
  const name = exerciseName(slug);

  const attempt = async (change: () => Promise<void>) => {
    try {
      await change();
    } catch (err) {
      showToast(errorMessage(err), { error: err });
    }
  };
  const remove = () => attempt(() => removeWorkoutExercise(id));

  const items: OverflowMenuItem[] = [
    ...(position > 0
      ? [{ label: "Move up", onPress: () => attempt(() => moveWorkoutExercise(id, position - 1)) }]
      : []),
    ...(position < count - 1
      ? [{ label: "Move down", onPress: () => attempt(() => moveWorkoutExercise(id, position + 1)) }]
      : []),
    {
      label: "Remove exercise",
      destructive: true,
      onPress: () => (sets.length > 0 ? setConfirmingRemove(true) : remove()),
    },
  ];

  return (
    <>
      <OverflowMenu label={`${name} actions`} items={items} />
      <ConfirmModal
        isOpen={confirmingRemove}
        title={`Remove ${name}?`}
        message={`Its ${sets.length === 1 ? "Set" : `${sets.length} Sets`} will be deleted too.`}
        confirmLabel="Remove"
        onCancel={() => setConfirmingRemove(false)}
        onConfirm={async () => {
          setConfirmingRemove(false);
          await remove();
        }}
      />
    </>
  );
}
