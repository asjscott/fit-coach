import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Icon } from "@/components/icons";
import { Pressable, type PressableProps } from "@/components/pressable";
import { Text } from "@/components/text";
import { spacing, useTheme } from "@/theme";

export type ExerciseRowProps = Pick<PressableProps, "accessibilityRole" | "accessibilityHint" | "onPress"> & {
  name: string;
  // A muted line under the name, e.g. what equipment is missing
  detail?: string;
  // Drawn muted: the user's equipment doesn't support it
  unavailable?: boolean;
  // Shown before the trailing chevron, e.g. the injury marker
  marker?: ReactNode;
  // A trailing chevron, for rows that open another screen
  chevron?: boolean;
};

// One Exercise in a list: a tappable row under a hairline, in place of a card
export function ExerciseRow({ name, detail, unavailable, marker, chevron, ...props }: ExerciseRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable style={[styles.row, { borderTopColor: colors.line }]} {...props}>
      <View style={styles.text}>
        <Text weight="semiBold" color={unavailable ? "muted" : "text"}>
          {name}
        </Text>
        {detail ? (
          <Text size="sm" color="subtle">
            {detail}
          </Text>
        ) : null}
      </View>
      {marker}
      {chevron ? <Icon name="chevronRight" color="subtle" size={20} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    minHeight: 56,
    paddingVertical: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, gap: 2 },
});
