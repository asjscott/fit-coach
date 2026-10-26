import type { Set } from "@fit/shared";
import { StyleSheet, View } from "react-native";
import { Icon } from "@/components/icons";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { bigNumber, fonts, spacing, useTheme } from "@/theme";
import { describeSet, setParts } from "../format";

export type SetRowProps = {
  set: Set;
  index: number;
  // The values count for each side
  unilateral?: boolean;
  // Being corrected below
  editing?: boolean;
  // Makes the row a button, ticked as logged, e.g. to correct the Set
  onPress?: () => void;
};

// A logged Set in a list, its values as big numbers and small units: "Set 1   16 kg × 10 per side"
export function SetRow({ set, index, unilateral = false, editing = false, onPress }: SetRowProps) {
  const { colors } = useTheme();
  const values = (
    <>
      <Text
        size="sm"
        color={editing ? "accent" : "subtle"}
        weight={editing ? "semiBold" : "regular"}
        style={styles.label}
      >
        Set {index + 1}
      </Text>
      <Text style={styles.values}>
        {setParts(set).map(([value, unit], i) => (
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
    </>
  );
  const description = `Set ${index + 1}, ${describeSet(set)}${unilateral ? " per side" : ""}`;

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={description} style={[styles.row, { borderTopColor: colors.line }]}>
        {values}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${description}. Edit`}
      onPress={onPress}
      style={[styles.row, { borderTopColor: colors.line }]}
    >
      {values}
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
  number: { ...bigNumber(26), lineHeight: 32 },
  unit: { fontFamily: fonts.medium, fontSize: 14 },
  trailing: { minWidth: 24, alignItems: "flex-end" },
});
