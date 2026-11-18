import { type ActivityLevel, DEFAULT_WEIGH_IN_DAY, FibreTarget, Weekday } from "@fit/shared";
import { useState } from "react";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetItem,
  ActionsheetItemText,
  ActionsheetSectionHeaderText,
} from "@/components/actionsheet";
import { ChoiceCards, CompactChoiceCards } from "@/components/choice-cards";
import { FormControl, FormControlError, FormControlErrorText } from "@/components/form-control";
import { Heading } from "@/components/heading";
import { Input, InputField } from "@/components/input";
import { LoadingButton } from "@/components/loading-button";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/modal";
import { Pressable } from "@/components/pressable";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import {
  ACTIVITY_LEVEL_NOTE,
  activityLevelLabel,
  activityLevelOptions,
} from "@/features/user/components/form/fields/user-activity-level-field";
import { LogWeighInModal } from "@/features/nutrition/components/log-weigh-in-modal";
import { weighInDateLabel } from "@/features/nutrition/weigh-in";
import { useCurrentUser, useWeightUnit } from "@/features/user/current-user-provider";
import { weightLabel } from "@/features/workouts/format";

// The latest Weigh-in, which is the body weight everything reads, and Log weight on any day (spec #158 stories 11
// and 14). The weight itself isn't edited anywhere else
export function WeighInRow() {
  const { user } = useCurrentUser();
  const unit = useWeightUnit();
  const [isOpen, setIsOpen] = useState(false);
  const latest = user?.latestWeighIn;

  return (
    <Stack spacing={2}>
      <HStack justify="between" spacing={4}>
        <Text color="muted">Weight</Text>
        <Text weight="semiBold" style={{ flexShrink: 1, textAlign: "right" }}>
          {latest ? `${weightLabel(latest.kg, unit)} · ${weighInDateLabel(latest.date)}` : "—"}
        </Text>
      </HStack>
      <LoadingButton label="Log weight" size="sm" action="secondary" icon="weight" onPress={() => setIsOpen(true)} />
      {isOpen ? <LogWeighInModal onClose={() => setIsOpen(false)} /> : null}
    </Stack>
  );
}

const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

// The day Today asks for the week's Weigh-in, Monday unless the user picks another (spec #158 story 8)
export function WeighInDayRow() {
  const { user, updateUser } = useCurrentUser();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const weighInDay = user?.profile.weighInDay ?? DEFAULT_WEIGH_IN_DAY;

  const choose = async (choice: Weekday) => {
    setIsOpen(false);
    if (choice === weighInDay) return;
    try {
      await updateUser({ profile: { weighInDay: choice } });
    } catch (err) {
      showToast("Couldn't change your Weigh-in Day", { error: err });
    }
  };

  return (
    <>
      <EditRow label="Weigh-in Day" value={WEEKDAY_LABELS[weighInDay]} onPress={() => setIsOpen(true)} />
      <Actionsheet isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ActionsheetBackdrop />
        <ActionsheetContent>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          <ActionsheetSectionHeaderText>Which day do you weigh in?</ActionsheetSectionHeaderText>
          {Weekday.options.map((day) => (
            <ActionsheetItem key={day} onPress={() => choose(day)}>
              <ActionsheetItemText>{WEEKDAY_LABELS[day]}</ActionsheetItemText>
            </ActionsheetItem>
          ))}
        </ActionsheetContent>
      </Actionsheet>
    </>
  );
}

// A Profile row that opens its editor
function EditRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}. Change`}>
      <HStack justify="between" spacing={4} style={{ minHeight: 44 }} align="center">
        <Text color="muted">{label}</Text>
        <Text weight="semiBold" color="accent" style={{ flexShrink: 1, textAlign: "right" }}>
          {value}
        </Text>
      </HStack>
    </Pressable>
  );
}

// The Activity Level, picked from its four described levels and saved straight away. A user who never chose one is
// counted as lightly active
export function ActivityLevelRow() {
  const { user, updateUser } = useCurrentUser();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const activityLevel = user?.profile.activityLevel;

  const choose = async (choice: ActivityLevel) => {
    setIsOpen(false);
    if (choice === activityLevel) return;
    try {
      await updateUser({ profile: { activityLevel: choice } });
    } catch (err) {
      showToast("Couldn't change how active you are", { error: err });
    }
  };

  return (
    <>
      <EditRow
        label="Activity Level"
        value={activityLevel ? activityLevelLabel(activityLevel) : "Not set"}
        onPress={() => setIsOpen(true)}
      />
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="md">How active are you?</Heading>
            <ModalCloseButton />
          </ModalHeader>
          <ModalBody>
            <Stack spacing={3}>
              <Text size="sm" color="muted">
                {ACTIVITY_LEVEL_NOTE}
              </Text>
              <CompactChoiceCards value>
                <ChoiceCards options={activityLevelOptions} value={activityLevel} onChange={choose} />
              </CompactChoiceCards>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

// The user's own fibre target, or the rule's 40 g per 1,000 kcal when they clear it (spec #158 stories 9 and 10)
export function FibreTargetRow() {
  const { user } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const fibreTargetG = user?.profile.fibreTargetG;

  return (
    <>
      <EditRow
        label="Fibre target"
        value={fibreTargetG ? `${fibreTargetG} g` : "Follows calories"}
        onPress={() => setIsOpen(true)}
      />
      {isOpen ? <FibreTargetModal current={fibreTargetG} onClose={() => setIsOpen(false)} /> : null}
    </>
  );
}

function FibreTargetModal({ current, onClose }: { current: number | undefined; onClose: () => void }) {
  const { updateUser } = useCurrentUser();
  const { showToast } = useToast();
  const [text, setText] = useState(current ? String(current) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"save" | "clear" | null>(null);

  const save = async (fibreTargetG: number | null, which: "save" | "clear") => {
    setSaving(which);
    try {
      await updateUser({ profile: { fibreTargetG } });
      onClose();
    } catch (err) {
      showToast("Couldn't change the fibre target", { error: err });
    } finally {
      setSaving(null);
    }
  };

  const handleSave = () => {
    const parsed = FibreTarget.safeParse(text.trim() === "" ? undefined : Number(text));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the number");
      return;
    }
    void save(parsed.data, "save");
  };

  return (
    <Modal isOpen onClose={() => saving === null && onClose()}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="md">Fibre target</Heading>
        </ModalHeader>
        <ModalBody>
          <Stack spacing={3}>
            <Text color="muted">Grams of fibre a day. Without one, it&apos;s 40 g for every 1,000 kcal you eat.</Text>
            <FormControl isInvalid={!!error}>
              <Input>
                <InputField
                  value={text}
                  onChangeText={(value) => {
                    setText(value);
                    setError(null);
                  }}
                  keyboardType="number-pad"
                  placeholder="g"
                  accessibilityLabel="Fibre target in grams"
                />
              </Input>
              {error ? (
                <FormControlError>
                  <FormControlErrorText>{error}</FormControlErrorText>
                </FormControlError>
              ) : null}
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          {current ? (
            <LoadingButton
              label="Follow calories"
              size="sm"
              action="secondary"
              loading={saving === "clear"}
              disabled={saving !== null}
              onPress={() => save(null, "clear")}
            />
          ) : null}
          <LoadingButton
            label="Save"
            size="sm"
            action="primary"
            loading={saving === "save"}
            disabled={saving !== null}
            onPress={handleSave}
          />
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
