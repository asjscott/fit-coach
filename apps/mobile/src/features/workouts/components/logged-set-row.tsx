import type { Set } from "@fit/shared";
import { StyleSheet, View } from "react-native";
import { Icon } from "@/components/icons";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { fonts, spacing, useTheme } from "@/theme";
import { describeSet } from "../format";

// The parts of a Set as big numbers and small units: "16 kg × 10", "12 reps", "45 s"
const parts = (set: Set): [number, string][] => {
  switch (set.kind) {
    case "external":
      return [
        [set.kg, "kg ×"],
        [set.reps, ""],
      ];
    case "bodyweight":
      return [[set.reps, "reps"]];
    case "timed":
      return [[set.seconds, "s"]];
  }
};

export type LoggedSetRowProps = {
  set: Set;
  index: number;
  // The values count for each side
  unilateral?: boolean;
  // Being corrected below
  editing?: boolean;
  onPress: () => void;
};

// A logged Set in the current Workout Exercise, readable between sets: "Set 1   16 kg × 10  ✓". Pressing it
// opens it for correcting or deleting
export function LoggedSetRow({ set, index, unilateral = false, editing = false, onPress }: LoggedSetRowProps) {
  const { colors } = useTheme();
  const perSide = unilateral ? " per side" : "";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Set ${index + 1}, ${describeSet(set)}${perSide}. Edit`}
      onPress={onPress}
      style={[styles.row, { borderTopColor: colors.line }]}
    >
      <Text
        size="sm"
        color={editing ? "accent" : "subtle"}
        weight={editing ? "semiBold" : "regular"}
        style={styles.label}
      >
        Set {index + 1}
      </Text>
      <Text style={styles.values}>
        {parts(set).map(([value, unit], i) => (
          <Text key={i}>
            <Text style={styles.number}>{value}</Text>
            {unit ? (
              <Text color="muted" style={styles.unit}>
                {` ${unit} `}
              </Text>
            ) : null}
          </Text>
        ))}
        {unilateral ? (
          <Text size="sm" color="muted">
            {" per side"}
          </Text>
        ) : null}
      </Text>
      <View style={styles.trailing}>
        {editing ? (
          <Text size="sm" color="accent" weight="semiBold">
            Editing
          </Text>
        ) : (
          <Icon name="check" color="accent" size={20} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing[1],
  },
  label: { width: 52 },
  values: { flex: 1 },
  number: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  unit: { fontFamily: fonts.medium, fontSize: 14 },
  trailing: { minWidth: 24, alignItems: "flex-end" },
});
