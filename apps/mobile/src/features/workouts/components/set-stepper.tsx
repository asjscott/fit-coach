import { StyleSheet } from "react-native";
import { Icon, type IconName } from "@/components/icons";
import { Input, InputField } from "@/components/input";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { bigNumber, radii, spacing, useTheme } from "@/theme";
import { stepValue, STEPS, type KgStep, type SetField } from "../set-entry";

// The unit drawn beside each field, filled or not
const UNITS: Record<SetField, string> = { kg: "kg", reps: "reps", seconds: "s" };

// One step, for screen readers: "Plus 1 rep", "Minus 5 seconds", "Plus one load"
const STEP_NAMES: Record<SetField, string> = {
  kg: "one load",
  reps: `${STEPS.reps} rep`,
  seconds: `${STEPS.seconds} seconds`,
};

export type SetStepperProps = {
  field: SetField;
  // What's typed, e.g. "16.25"
  value: string;
  onChange: (value: string) => void;
  // Where kg goes on − or +: the Logbook's next load
  stepKg: KgStep;
};

// One Set value with − and + either side: kg to the next load, reps by 1, seconds by 5. Any value can still be typed
export function SetStepper({ field, value, onChange, stepKg }: SetStepperProps) {
  const unit = UNITS[field];
  const step = (direction: 1 | -1) => onChange(stepValue(field, value, direction, stepKg));

  return (
    <Input size="xl" style={styles.root}>
      <StepButton icon="minus" label={`Minus ${STEP_NAMES[field]}`} onPress={() => step(-1)} />
      <InputField
        value={value}
        onChangeText={onChange}
        placeholder="0"
        keyboardType={field === "kg" ? "decimal-pad" : "number-pad"}
        selectTextOnFocus
        accessibilityLabel={field}
        style={styles.field}
      />
      <Text color="muted" weight="medium" style={styles.unit} importantForAccessibility="no">
        {unit}
      </Text>
      <StepButton icon="plus" label={`Plus ${STEP_NAMES[field]}`} onPress={() => step(1)} />
    </Input>
  );
}

function StepButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
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
