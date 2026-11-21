import type { Day } from "@fit/shared";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Icon } from "@/components/icons";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";
import { coachSummary } from "../coach-summary";

// The Coach's summary of what's left of the day (prototype variant J): under Today's rings, where a tap opens the Food
// tab's Ideas half, and at the top of that half with its Food Ideas below
export function CoachSummaryCard({
  day,
  onPress,
  children,
}: {
  day: Day;
  onPress?: () => void;
  // The Food Ideas and the Diet, on the Ideas half
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const { headline, line } = coachSummary(day);
  const summary = (
    <View style={styles.summary}>
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
        <Icon name="target" size={16} color="accent" />
      </View>
      <View style={styles.words}>
        <Text weight="semiBold">{headline}</Text>
        {line ? (
          <Text size="sm" color="muted">
            {line}
          </Text>
        ) : null}
      </View>
      {onPress ? <Icon name="chevronRight" color="subtle" size={20} /> : null}
    </View>
  );
  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.line }];

  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={line ? `${headline} ${line}` : headline}
      accessibilityHint="Opens Food Ideas"
      style={[card, styles.compact]}
    >
      {summary}
    </Pressable>
  ) : (
    <View style={card}>
      {summary}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], gap: spacing[3], borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth },
  compact: { padding: spacing[3] },
  summary: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  words: { flex: 1, gap: 2 },
});
