import { ChoiceModal, type Choice } from "@/components/choice-modal";
import { useToast } from "@/contexts/toast-context";
import { useLogbook } from "../logbook-provider";
import { toastWhenUploaded } from "../upload-toast";

// A Workout left more than 3 hours after its last Set was probably forgotten. The user
// must finish it at the last Set or discard it before carrying on, so there is no cancel
export function ForgottenWorkoutModal({ isOpen, onDone }: { isOpen: boolean; onDone: () => void }) {
  const { workout, finishAtLastSet, discard } = useLogbook();
  const { showToast } = useToast();

  const hasSets = workout?.workoutExercises.some((we) => we.sets.length > 0) ?? false;

  const handleDiscard = async () => {
    try {
      await discard();
      onDone();
    } catch (err) {
      showToast("Couldn't discard the Workout", { error: err });
    }
  };

  const handleFinish = async () => {
    try {
      const outcome = await finishAtLastSet();
      if (outcome.status === "pending") toastWhenUploaded(showToast, outcome);
      else await discard();
      onDone();
    } catch (err) {
      showToast("Couldn't finish the Workout", { error: err });
    }
  };

  const choices: Choice[] = [{ label: "Discard", action: "negative", onPress: handleDiscard }];
  if (hasSets) choices.push({ label: "Finish at last Set", action: "primary", onPress: handleFinish });

  return (
    <ChoiceModal
      isOpen={isOpen}
      title="Forgot to finish?"
      message={
        hasSets
          ? "Your Workout has been open for more than 3 hours since the last Set. Finish it at the last Set, or discard it."
          : "Your Workout has been open for more than 3 hours with no Sets. Discard it to carry on."
      }
      choices={choices}
    />
  );
}
