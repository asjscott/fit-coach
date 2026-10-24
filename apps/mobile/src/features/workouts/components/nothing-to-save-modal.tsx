import { useState } from "react";
import { Button, ButtonSpinner, ButtonText } from "@/components/button";
import { Heading } from "@/components/heading";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/modal";
import { Text } from "@/components/text";
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
  const { discard } = useLogbook();
  const { showToast } = useToast();
  const [discarding, setDiscarding] = useState(false);

  const handleDiscard = async () => {
    setDiscarding(true);
    try {
      await discard();
      onClose();
      onDiscarded();
    } catch (err) {
      showToast("Couldn't discard the workout", { error: err });
    } finally {
      setDiscarding(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="md">Nothing to save</Heading>
        </ModalHeader>
        <ModalBody>
          <Text color="textMuted">This workout has no Sets, so it won't be saved. Discard it?</Text>
        </ModalBody>
        <ModalFooter>
          <Button action="default" size="sm" onPress={onClose}>
            <ButtonText>Keep logging</ButtonText>
          </Button>
          <Button action="negative" size="sm" onPress={handleDiscard} disabled={discarding}>
            {discarding && <ButtonSpinner />}
            <ButtonText>Discard</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
