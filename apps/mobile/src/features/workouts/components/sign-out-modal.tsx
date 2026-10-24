import { ConfirmModal } from "@/components/choice-modal";

// What signing out will lose from the phone, or null when nothing would be lost
export function signOutWarning(pendingCount: number, hasWorkoutInProgress: boolean): string | null {
  const lost: string[] = [];
  if (pendingCount > 0) {
    lost.push(
      pendingCount === 1
        ? "1 Workout hasn't uploaded and will be lost."
        : `${pendingCount} Workouts haven't uploaded and will be lost.`,
    );
  }
  if (hasWorkoutInProgress) lost.push("Your Workout in progress will be lost.");
  return lost.length ? lost.join(" ") : null;
}

// Warns before signing out throws away Workouts that only exist on this phone, so the
// user can wait for signal instead
export function SignOutModal({
  isOpen,
  warning,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  warning: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      title="Sign out?"
      message={warning}
      confirmLabel="Sign out"
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  );
}
