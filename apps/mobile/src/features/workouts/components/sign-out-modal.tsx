import { useState } from "react";
import { Button, ButtonSpinner, ButtonText } from "@/components/button";
import { Heading } from "@/components/heading";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/modal";
import { Text } from "@/components/text";

// What signing out will lose from the phone, or null when nothing would be lost
export function signOutWarning(pendingCount: number, hasWorkoutInProgress: boolean): string | null {
  const lost: string[] = [];
  if (pendingCount > 0) {
    lost.push(
      pendingCount === 1
        ? "1 workout hasn't uploaded and will be lost."
        : `${pendingCount} workouts haven't uploaded and will be lost.`,
    );
  }
  if (hasWorkoutInProgress) lost.push("Your workout in progress will be lost.");
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
  const [signingOut, setSigningOut] = useState(false);

  const handleConfirm = async () => {
    setSigningOut(true);
    try {
      await onConfirm();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="md">Sign out?</Heading>
        </ModalHeader>
        <ModalBody>
          <Text color="textMuted">{warning}</Text>
        </ModalBody>
        <ModalFooter>
          <Button action="default" size="sm" onPress={onClose}>
            <ButtonText>Cancel</ButtonText>
          </Button>
          <Button action="negative" size="sm" onPress={handleConfirm} disabled={signingOut}>
            {signingOut && <ButtonSpinner />}
            <ButtonText>Sign out</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
