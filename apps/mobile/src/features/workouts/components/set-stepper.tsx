import type { StepDirection } from "@fit/engines";
import type { WeightUnit } from "@fit/shared";
import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { Icon, type IconName } from "@/components/icons";
import { Input, InputField } from "@/components/input";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { bigNumber, radii, spacing, useTheme } from "@/theme";
import { startRepeating } from "../hold-to-repeat";
import { fieldLabel, loadStepLabel, stepValue, STEPS, type LoadStep, type SetField } from "../set-entry";

// The unit drawn beside reps and seconds, filled or not; a load's is the user's
const UNITS: Record<Exclude<SetField, "load">, string> = { reps: "reps", seconds: "s" };

// One step of reps or seconds, for screen readers: "Plus 1 rep", "Minus 5 seconds"
const STEP_NAMES: Record<Exclude<SetField, "load">, string> = {
  reps: `${STEPS.reps} rep`,
  seconds: `${STEPS.seconds} seconds`,
};

// A load is typed and stepped in the user's unit
export type LoadSteps = {
  step: LoadStep;
  // Else a load steps by 5 lb or 2 kg, and screen readers say so
  loadsKnown: boolean;
  unit: WeightUnit;
};

export type SetStepperProps = {
  // What's typed, e.g. "16.5"
  value: string;
  onChange: (value: string) => void;
} & (({ field: "load" } & LoadSteps) | { field: Exclude<SetField, "load"> });

// One Set value with − and + either side: a load to the next load, reps by 1, seconds by 5, repeating while held. Any
// value can still be typed
export function SetStepper(props: SetStepperProps) {
  const { field, value, onChange } = props;
  const unit = props.field === "load" ? props.unit : UNITS[props.field];
  // The latest value, so steps repeated while held build on each other before the parent re-renders
  const latest = useRef(value);
  latest.current = value;
  const step = (direction: StepDirection) => {
    latest.current =
      props.field === "load"
        ? stepValue("load", latest.current, direction, props.step)
        : stepValue(props.field, latest.current, direction);
    onChange(latest.current);
  };
  const label = (direction: StepDirection) =>
    props.field === "load"
      ? loadStepLabel(direction, props.loadsKnown, props.unit)
      : `${direction === 1 ? "Plus" : "Minus"} ${STEP_NAMES[props.field]}`;

  return (
    <Input size="xl" style={styles.root}>
      <StepButton icon="minus" label={label(-1)} onStep={() => step(-1)} />
      <InputField
        value={value}
        onChangeText={onChange}
        placeholder="0"
        keyboardType={field === "load" ? "decimal-pad" : "number-pad"}
        selectTextOnFocus
        accessibilityLabel={props.field === "load" ? fieldLabel(field, props.unit) : field}
        style={styles.field}
      />
      <Text color="muted" weight="medium" style={styles.unit} importantForAccessibility="no">
        {unit}
      </Text>
      <StepButton icon="plus" label={label(1)} onStep={() => step(1)} />
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
