import type { StepDirection } from "@fit/engines";
import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { Icon, type IconName } from "@/components/icons";
import { Input, InputField } from "@/components/input";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { bigNumber, radii, spacing, useTheme } from "@/theme";
import { startRepeating } from "../hold-to-repeat";
import type { SetReading } from "../library";
import { fieldStepper, loadReading, stepValue, type LoadEntry, type LoadSteps, type SetField } from "../set-entry";

export type SetStepperProps = {
  // What's typed, e.g. "16.5"
  value: string;
} &
  // A load's exact kg comes with it, unless it's typed
  (
    | { field: "load"; kg?: number; steps: LoadSteps; onChange: (value: string, kg?: number) => void }
    | {
        onChange: (value: string) => void;
        field: Exclude<SetField, "load">;
        // How the Exercise's Sets read: a Jump's reps are its contacts (#105), the walk's seconds minutes
        reading: SetReading;
      }
  );

// One Set value with − and + either side: a load to the next load, reps by 1, seconds by 5 (the walk by the
// minute, #145), repeating while held. Any value can still be typed: the walk shows in minutes, as seconds while being
// typed
export function SetStepper(props: SetStepperProps) {
  const { value, onChange } = props;
  const stepper = props.field === "load" ? loadReading(props.steps) : fieldStepper(props.field, props.reading);
  const [typing, setTyping] = useState(false);
  const shown = stepper.shown(value, typing);
  // The latest value, so steps repeated while held build on each other before the parent re-renders
  const latest = useRef<LoadEntry>({ text: value });
  latest.current = { text: value, kg: props.field === "load" ? props.kg : undefined };
  const step = (direction: StepDirection) => {
    const { current } = latest;
    latest.current =
      props.field === "load"
        ? props.steps.step(current, direction)
        : { text: stepValue(fieldStepper(props.field, props.reading), current.text, direction) };
    onChange(latest.current.text, latest.current.kg);
  };

  return (
    <Input size="xl" style={styles.root}>
      <StepButton icon="minus" label={stepper.stepLabel(value, -1)} onStep={() => step(-1)} />
      <InputField
        value={shown.value}
        onChangeText={(text) => onChange(text)}
        onFocus={() => setTyping(true)}
        onBlur={() => setTyping(false)}
        placeholder="0"
        keyboardType={stepper.keyboardType}
        selectTextOnFocus
        accessibilityLabel={shown.name}
        style={styles.field}
      />
      <Text color="muted" weight="medium" style={styles.unit} importantForAccessibility="no">
        {shown.unit}
      </Text>
      <StepButton icon="plus" label={stepper.stepLabel(value, 1)} onStep={() => step(1)} />
    </Input>
  );
}

// How long a press must last before it repeats; a shorter one is a tap
const HOLD_DELAY = 400;

// A tap (or a screen reader's activation, which is onPress) steps once; holding steps until release
function StepButton({ icon, label, onStep }: { icon: IconName; label: string; onStep: () => void }) {
  const { colors } = useTheme();
  const release = useRef<(() => void) | null>(null);
  const stop = () => {
    release.current?.();
    release.current = null;
  };
  useEffect(() => stop, []);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onStep}
      delayLongPress={HOLD_DELAY}
      onLongPress={() => {
        stop();
        release.current = startRepeating(onStep);
      }}
      onPressOut={stop}
      style={[styles.button, { backgroundColor: colors.raised }]}
    >
      <Icon name={icon} color="text" size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { height: 60, borderWidth: 1.5, paddingHorizontal: spacing[1] + 2 },
  // The number ends at the middle and the unit starts there, so the pair sits centred
  field: {
    textAlign: "right",
    paddingHorizontal: 0,
    ...bigNumber(26),
    minWidth: 0,
  },
  unit: { flex: 1, marginLeft: spacing[1] + 2, fontSize: 16 },
  button: { width: 46, height: 46, borderRadius: radii.sm + 2, alignItems: "center", justifyContent: "center" },
});
