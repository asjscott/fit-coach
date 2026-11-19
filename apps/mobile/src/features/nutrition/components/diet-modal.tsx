import { AvoidedFood, DEFAULT_DIET, DietKind } from "@fit/shared";
import { useState } from "react";
import { Chip } from "@/components/chip";
import { Heading } from "@/components/heading";
import { LoadingButton } from "@/components/loading-button";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/modal";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { AVOIDED_FOOD_LABELS, DIET_KIND_LABELS } from "../diet";

// Changes the Diet and the foods to avoid, from Profile or the Ideas half (spec #158 stories 6, 7 and 61). Rendered
// only while open, so each opening starts from the saved Diet
export function DietModal({ onClose }: { onClose: () => void }) {
  const { user, updateUser } = useCurrentUser();
  const { showToast } = useToast();
  const saved = user?.profile.diet ?? DEFAULT_DIET;
  const [kind, setKind] = useState<DietKind>(saved.kind);
  const [avoid, setAvoid] = useState<AvoidedFood[]>(saved.avoid);
  const [saving, setSaving] = useState(false);

  const toggle = (food: AvoidedFood) =>
    setAvoid((foods) =>
      // Kept in the list's own order, however they were ticked
      AvoidedFood.options.filter((f) => (f === food ? !foods.includes(f) : foods.includes(f))),
    );

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser({ profile: { diet: { kind, avoid } } });
      onClose();
    } catch (err) {
      showToast("Couldn't change your Diet", { error: err });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={() => !saving && onClose()}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="md">Diet</Heading>
        </ModalHeader>
        <ModalBody>
          <Stack spacing={4}>
            <Text color="muted">
              The Coach only suggests Food Ideas your Diet allows. Search and Scan still find every food.
            </Text>
            <Stack spacing={2}>
              <Text size="sm" color="muted">
                I eat
              </Text>
              <HStack spacing={2} wrap="wrap" accessibilityRole="radiogroup" accessibilityLabel="Diet">
                {DietKind.options.map((option) => (
                  <Chip
                    key={option}
                    label={DIET_KIND_LABELS[option]}
                    selected={kind === option}
                    onPress={() => setKind(option)}
                  />
                ))}
              </HStack>
            </Stack>
            <Stack spacing={2}>
              <Text size="sm" color="muted">
                Foods I avoid
              </Text>
              <HStack spacing={2} wrap="wrap" accessibilityLabel="Foods I avoid">
                {AvoidedFood.options.map((food) => (
                  <Chip
                    key={food}
                    label={AVOIDED_FOOD_LABELS[food]}
                    selected={avoid.includes(food)}
                    onPress={() => toggle(food)}
                  />
                ))}
              </HStack>
            </Stack>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <LoadingButton label="Cancel" size="sm" action="secondary" disabled={saving} onPress={onClose} />
          <LoadingButton label="Save" size="sm" action="primary" loading={saving} onPress={handleSave} />
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
