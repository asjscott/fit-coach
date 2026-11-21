import { useState } from "react";
import { StyleSheet } from "react-native";
import { Icon } from "@/components/icons";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";
import { LogWeighInModal } from "./log-weigh-in-modal";

// Today's ask for this week's Weigh-in on the Weigh-in Day (spec #158 story 12). It goes once the Weigh-in is logged
export function WeighInReminderRow() {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}
      >
        <Icon name="weight" size={18} />
        <Text weight="semiBold" style={{ flex: 1 }}>
          Log this week&apos;s weight
        </Text>
        <Icon name="chevronRight" color="subtle" size={20} />
      </Pressable>
      {isOpen ? <LogWeighInModal onClose={() => setIsOpen(false)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    minHeight: 52,
    paddingHorizontal: spacing[4],
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
