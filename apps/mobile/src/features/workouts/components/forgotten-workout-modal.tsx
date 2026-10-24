import { useState } from "react";
import { Button, ButtonSpinner, ButtonText } from "@/components/button";
import { Heading } from "@/components/heading";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/modal";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { useLogbook } from "../logbook-provider";

// A Workout left more than 3 hours after its last Set was probably forgotten. The user
// must finish it at the last Set or discard it before carrying on, so there is no cancel
export function ForgottenWorkoutModal({ isOpen, onDone }: { isOpen: boolean; onDone: () => void }) {
  const { workout, finishAtLastSet, discard } = useLogbook();
  const { showToast } = useToast();
  const [busy, setBusy] = useState<"finish" | "discard" | null>(null);

  const hasSets = workout?.workoutExercises.some((we) => we.sets.length > 0) ?? false;

  const handle = async (action: "finish" | "discard") => {
    setBusy(action);
    try {
      if (action === "finish") {
        const outcome = await finishAtLastSet();
        if (outcome.status === "pending") {
          showToast(outcome.uploaded ? "Workout saved" : "Saved on your phone; it will upload when you have signal", {
            type: outcome.uploaded ? "success" : "info",
          });
        } else {
          await discard();
        }
      } else {
        await discard();
      }
      onDone();
    } catch (err) {
      showToast(action === "finish" ? "Couldn't finish the workout" : "Couldn't discard the workout", { error: err });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="md">Forgot to finish?</Heading>
        </ModalHeader>
        <ModalBody>
          <Text color="textMuted">
            {hasSets
              ? "Your workout has been open for more than 3 hours since the last Set. Finish it at the last Set, or discard it."
              : "Your workout has been open for more than 3 hours with no Sets. Discard it to carry on."}
          </Text>
        </ModalBody>
        <ModalFooter>
          <Button action="negative" size="sm" onPress={() => handle("discard")} disabled={busy !== null}>
            {busy === "discard" && <ButtonSpinner />}
            <ButtonText>Discard</ButtonText>
          </Button>
          {hasSets && (
            <Button action="primary" size="sm" onPress={() => handle("finish")} disabled={busy !== null}>
              {busy === "finish" && <ButtonSpinner />}
              <ButtonText>Finish at last Set</ButtonText>
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
