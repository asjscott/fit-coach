import { LogbookError } from "@fit/engines";
import { router } from "expo-router";
import { useState } from "react";
import { FormControl, FormControlError, FormControlErrorText, FormControlLabel, FormControlLabelText } from "@/components/form-control";
import { Input, InputField } from "@/components/input";
import { LoadingButton } from "@/components/loading-button";
import { Screen } from "@/components/screen";
import { HStack, Stack } from "@/components/stack";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { spacing } from "@/theme";
import { NothingToSaveModal } from "../components/nothing-to-save-modal";
import { useLogbook, type FinishOutcome } from "../logbook-provider";

const pad = (n: number) => String(n).padStart(2, "0");

// Local date and time as the user types them: "2026-10-24" and "09:30"
const dateText = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const timeText = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

type TimeFields = { date: string; time: string };

const toFields = (date: Date): TimeFields => ({ date: dateText(date), time: timeText(date) });

// The typed local date and time, or null when it isn't a real one
function parseFields({ date, time }: TimeFields): Date | null {
  const d = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!d || !t) return null;
  const [year, month, day, hours, minutes] = [d[1], d[2], d[3], t[1], t[2]].map(Number);
  const parsed = new Date(year, month - 1, day, hours, minutes);
  const isReal =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day &&
    parsed.getHours() === hours &&
    parsed.getMinutes() === minutes;
  return isReal ? parsed : null;
}

// Start and end come pre-filled (when Start was tapped, and now) and can be changed,
// for example when backfilling yesterday's Workout
export default function FinishView() {
  const { workout, finish } = useLogbook();
  const { showToast } = useToast();
  // Kept to the second while the user leaves a field alone, so a short Workout isn't
  // rounded down to start and end in the same minute
  const [initial] = useState(() => ({
    startedAt: workout ? new Date(workout.startedAt) : new Date(),
    endedAt: new Date(),
  }));
  const [start, setStart] = useState(() => toFields(initial.startedAt));
  const [end, setEnd] = useState(() => toFields(initial.endedAt));
  const [errors, setErrors] = useState<{ start?: string; end?: string }>({});
  const [finishing, setFinishing] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  if (!workout) {
    return (
      <Screen edges={["bottom"]}>
        <Text color="textMuted">No Workout in progress.</Text>
      </Screen>
    );
  }

  const timeFrom = (fields: TimeFields, initialDate: Date) => {
    const unchanged = fields.date === dateText(initialDate) && fields.time === timeText(initialDate);
    return unchanged ? initialDate : parseFields(fields);
  };

  const showOutcome = (outcome: FinishOutcome) => {
    if (outcome.status === "nothing-to-save") {
      setConfirmingDiscard(true);
      return;
    }
    showToast(outcome.uploaded ? "Workout saved" : "Saved on your phone; it will upload when you have signal", {
      type: outcome.uploaded ? "success" : "info",
    });
    router.dismissTo("/");
  };

  const handleFinish = async () => {
    const startedAt = timeFrom(start, initial.startedAt);
    const endedAt = timeFrom(end, initial.endedAt);
    const invalid = "Enter a date like 2026-10-24 and a time like 09:30";
    if (!startedAt || !endedAt) {
      setErrors({ start: startedAt ? undefined : invalid, end: endedAt ? undefined : invalid });
      return;
    }
    setErrors({});
    setFinishing(true);
    try {
      showOutcome(await finish({ startedAt, endedAt }));
    } catch (err) {
      // Both time rules are about the end: before the start, or in the future
      if (err instanceof LogbookError) setErrors({ end: err.message });
      else showToast("Couldn't finish", { error: err });
    } finally {
      setFinishing(false);
    }
  };

  return (
    <Screen scroll edges={["bottom"]}>
      <Stack spacing={6} flex>
        <TimeField label="Start" value={start} onChange={setStart} error={errors.start} />
        <TimeField label="End" value={end} onChange={setEnd} error={errors.end} />
        <Text size="sm" color="textMuted">
          Exercises with no Sets are left out.
        </Text>
      </Stack>
      <Stack spacing={2} style={{ marginTop: spacing[6] }}>
        <LoadingButton label="Save workout" icon="check" loading={finishing} onPress={handleFinish} />
      </Stack>
      <NothingToSaveModal
        isOpen={confirmingDiscard}
        onClose={() => setConfirmingDiscard(false)}
        onDiscarded={() => router.dismissTo("/")}
      />
    </Screen>
  );
}

function TimeField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: TimeFields;
  onChange: (value: TimeFields) => void;
  error?: string;
}) {
  return (
    <FormControl isInvalid={error !== undefined}>
      <FormControlLabel>
        <FormControlLabelText>{label}</FormControlLabelText>
      </FormControlLabel>
      <HStack spacing={2}>
        <Input style={{ flex: 3 }}>
          <InputField
            value={value.date}
            onChangeText={(date) => onChange({ ...value, date })}
            placeholder="YYYY-MM-DD"
            accessibilityLabel={`${label} date`}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Input>
        <Input style={{ flex: 2 }}>
          <InputField
            value={value.time}
            onChangeText={(time) => onChange({ ...value, time })}
            placeholder="HH:MM"
            accessibilityLabel={`${label} time`}
            keyboardType="numbers-and-punctuation"
          />
        </Input>
      </HStack>
      {error !== undefined && (
        <FormControlError>
          <FormControlErrorText>{error}</FormControlErrorText>
        </FormControlError>
      )}
    </FormControl>
  );
}
