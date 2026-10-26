import { Pressable, StyleSheet } from "react-native";
import { radii, spacing, useThemedStyles, type Colors } from "@/theme";
import { Text } from "../text";

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

// Selectable pill, e.g. for multi-select pickers
export function Chip({ label, selected = false, onPress, disabled }: ChipProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text size="sm" weight="semiBold" color={selected ? "accent" : "muted"}>
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    chip: {
      alignItems: "center",
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.surface,
    },
    selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    pressed: { opacity: 0.8 },
    disabled: { opacity: 0.4 },
  });
