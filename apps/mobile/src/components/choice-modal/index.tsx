import { useState } from "react";
import type { ButtonAction } from "../button";
import { Heading } from "../heading";
import { LoadingButton } from "../loading-button";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "../modal";
import { Text } from "../text";

export type Choice = {
  label: string;
  action?: ButtonAction;
  // May be async: its button shows a spinner and every button is disabled until it settles
  onPress: () => void | Promise<void>;
};

// A question with a button per answer. Without onClose the user must pick one
export function ChoiceModal({
  isOpen,
  title,
  message,
  choices,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  choices: Choice[];
  onClose?: () => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);

  const handlePress = async (index: number) => {
    setBusy(index);
    try {
      await choices[index].onPress();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => busy === null && onClose?.()}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="md">{title}</Heading>
        </ModalHeader>
        <ModalBody>
          <Text color="muted">{message}</Text>
        </ModalBody>
        <ModalFooter>
          {choices.map(({ label, action = "default" }, i) => (
            <LoadingButton
              key={label}
              label={label}
              size="sm"
              action={action}
              loading={busy === i}
              disabled={busy !== null}
              onPress={() => handlePress(i)}
            />
          ))}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// Asks before a change that can't be undone: cancel, or confirm with a destructive button
export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <ChoiceModal
      isOpen={isOpen}
      title={title}
      message={message}
      onClose={onCancel}
      choices={[
        { label: cancelLabel, onPress: onCancel },
        { label: confirmLabel, action: "negative", onPress: onConfirm },
      ]}
    />
  );
}
