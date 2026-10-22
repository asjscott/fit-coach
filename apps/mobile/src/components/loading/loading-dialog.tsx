import type { ReactNode } from "react";
import { Heading } from "../heading";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalHeader } from "../modal";
import { Spinner } from "../spinner";
import { Stack } from "../stack";

export type LoadingDialogProps = {
  title?: string;
  isLoading: boolean;
  children?: ReactNode;
};

// Blocking dialog while a save is in flight; it can't be dismissed
export function LoadingDialog({ title = "Loading", isLoading, children }: LoadingDialogProps) {
  return (
    <Modal isOpen={isLoading} onClose={() => {}} size="sm">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="md">{title}</Heading>
        </ModalHeader>
        <ModalBody>
          <Stack spacing={4} align="center">
            <Spinner size="lg" />
            {children}
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
