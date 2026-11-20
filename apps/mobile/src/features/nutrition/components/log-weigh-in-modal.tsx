import { bodyWeightAnswer, bodyWeightInUnit } from "@fit/shared";
import { useRef, useState } from "react";
import { Chip } from "@/components/chip";
import { FormControl, FormControlError, FormControlErrorText } from "@/components/form-control";
import { Heading } from "@/components/heading";
import { Input, InputField } from "@/components/input";
import { LoadingButton } from "@/components/loading-button";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/modal";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { useCurrentUser, useTimeZone, useWeightUnit } from "@/features/user/current-user-provider";
import { weighInDays } from "../weigh-in";

// Logs a Weigh-in in the user's unit, for today unless they pick one of the 6 days before (spec #158 stories 14 to
// 17). Rendered only while open, so each opening starts from today and the latest weight. It can always be closed:
// closing while Save waits stops waiting, and Profile keeps the weight it had (#172)
export function LogWeighInModal({ onClose }: { onClose: () => void }) {
  const { user, logWeighIn } = useCurrentUser();
  const unit = useWeightUnit();
  const { showToast } = useToast();
  // The days as the server counts them, so every day offered is one it takes
  const timeZone = useTimeZone();
  const [days] = useState(() => weighInDays(new Date(), timeZone));
  const [date, setDate] = useState(days[0].date);
  const latestKg = user?.latestWeighIn?.kg;
  const [text, setText] = useState(latestKg ? String(bodyWeightInUnit(latestKg, unit)) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveController = useRef<AbortController | null>(null);

  const close = () => {
    saveController.current?.abort();
    onClose();
  };

  const handleSave = async () => {
    const parsed = bodyWeightAnswer(unit).safeParse(text.trim() === "" ? undefined : Number(text.replace(",", ".")));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the number");
      return;
    }
    const controller = new AbortController();
    saveController.current = controller;
    setSaving(true);
    try {
      await logWeighIn(date, { weight: parsed.data, unit }, controller.signal);
      onClose();
    } catch (err) {
      // Closed while saving: the user has moved on, so there's nothing to say
      if (controller.signal.aborted) return;
      showToast("Couldn't log your weight", { error: err });
    } finally {
      if (!controller.signal.aborted) setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={close}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="md">Log weight</Heading>
        </ModalHeader>
        <ModalBody>
          <Stack spacing={4}>
            <Text color="muted">
              Weigh yourself before breakfast. Your Daily Targets follow it, and another Weigh-in this week replaces it.
            </Text>
            <FormControl isInvalid={!!error}>
              <Input>
                <InputField
                  value={text}
                  onChangeText={(value) => {
                    setText(value);
                    setError(null);
                  }}
                  keyboardType="decimal-pad"
                  placeholder={unit}
                  accessibilityLabel={`Weight in ${unit}`}
                />
              </Input>
              {error ? (
                <FormControlError>
                  <FormControlErrorText>{error}</FormControlErrorText>
                </FormControlError>
              ) : null}
            </FormControl>
            <Stack spacing={2}>
              <Text size="sm" color="muted">
                Weighed on
              </Text>
              <HStack spacing={2} wrap="wrap">
                {days.map((day) => (
                  <Chip
                    key={day.date}
                    label={day.label}
                    selected={day.date === date}
                    onPress={() => setDate(day.date)}
                  />
                ))}
              </HStack>
            </Stack>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <LoadingButton label="Cancel" size="sm" action="secondary" onPress={close} />
          <LoadingButton label="Save" size="sm" action="primary" loading={saving} onPress={handleSave} />
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
