import type { Set } from "@fit/shared";
import { StyleSheet, View } from "react-native";
import { Icon, type IconName } from "@/components/icons";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { bigNumber, fonts, radii, spacing, useTheme } from "@/theme";
import { describeSet, setParts } from "../format";
import { useWeightUnit } from "@/features/user/current-user-provider";

// What can be done to a logged Set from its row: its ⋯ opens Edit and Delete in the row, and a tick closes them
export type SetRowActions = {
  // Showing Edit, Delete and the tick in place of the ⋯
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export type SetRowProps = {
  set: Set;
  index: number;
  // The values count for each side
  unilateral?: boolean;
  // Being corrected below
  editing?: boolean;
  // Ticks the row as logged and gives it a ⋯, e.g. on the In-progress Workout
  actions?: SetRowActions;
};

// A logged Set in a list, its values as big numbers and small units: "Set 1   16 kg × 10 per side". Always one line, so
// the row keeps its height: the open row gives the tick and "Set" up to the buttons, and long values shrink to fit
export function SetRow({ set, index, unilateral = false, editing = false, actions }: SetRowProps) {
  const unit = useWeightUnit();
  const { colors } = useTheme();
  const number = index + 1;
  const open = actions?.open ?? false;

  return (
    <View
      accessible={!actions}
      accessibilityLabel={`Set ${number}, ${describeSet(set, unit)}${unilateral ? " per side" : ""}`}
      style={[styles.row, { borderTopColor: colors.line }]}
    >
      {actions && !open ? <Icon name="check" color="accent" size={18} /> : null}
      <Text
        size="sm"
        color={editing ? "accent" : "subtle"}
        weight={editing ? "semiBold" : "regular"}
        style={!open && styles.label}
      >
        {open ? number : `Set ${number}`}
      </Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={styles.values}>
        {setParts(set, unit).map(([value, label], i) => (
          <Text key={i}>
            <Text style={styles.number}>{value}</Text>
            {label ? (
              <Text color="muted" style={styles.unit}>
                {` ${label} `}
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
      {!actions ? null : open ? (
        <View style={styles.buttons}>
          <RowButton icon="pencil" label={`Edit set ${number}`} active={editing} onPress={actions.onEdit} />
          <RowButton icon="trash" label={`Delete set ${number}`} color="danger" onPress={actions.onDelete} />
          <RowButton icon="check" label={`Done with set ${number}`} onPress={actions.onClose} />
        </View>
      ) : (
        <RowButton icon="ellipsis" label={`Set ${number} actions`} color="text" onPress={actions.onOpen} />
      )}
    </View>
  );
}

function RowButton({
  icon,
  label,
  color = "muted",
  active = false,
  onPress,
}: {
  icon: IconName;
  label: string;
  color?: "muted" | "text" | "danger";
  // Highlighted while its action is under way, e.g. Edit while editing
  active?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.button, active && { backgroundColor: colors.accentSoft }]}
    >
      <Icon name={icon} color={active ? "accent" : color} size={icon === "ellipsis" ? 22 : 20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing[1],
  },
  label: { width: 52 },
  values: { flex: 1 },
  number: { ...bigNumber(26), lineHeight: 32 },
  unit: { fontFamily: fonts.medium, fontSize: 14 },
  buttons: { flexDirection: "row" },
  button: { width: 44, height: 44, borderRadius: radii.sm, alignItems: "center", justifyContent: "center" },
});
