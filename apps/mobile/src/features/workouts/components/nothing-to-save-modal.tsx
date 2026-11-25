import { ConfirmModal } from "@/components/choice-modal";
import { useToast } from "@/contexts/toast-context";
import { useLogbook } from "../logbook-provider";

// Finishing with no Sets saves nothing; confirming discards the Workout instead
export function NothingToSaveModal({
  isOpen,
  onClose,
  onDiscarded,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDiscarded: () => void;
}) {
  const { workout, discard } = useLogbook();
  const { showToast } = useToast();

  const handleDiscard = async () => {
    try {
      await discard();
      onClose();
      onDiscarded();
    } catch (err) {
      showToast("Couldn't discard the Workout", { error: err });
    }
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      title="Nothing to save"
      message={
        workout?.assessment === "single"
          ? "This Assessment Workout has no Sets, so it won't be saved and there won't be a result. Discard it?"
          : "This Workout has no Sets, so it won't be saved. Discard it?"
      }
      cancelLabel="Keep logging"
      confirmLabel="Discard"
      onCancel={onClose}
      onConfirm={handleDiscard}
    />
  );
}
