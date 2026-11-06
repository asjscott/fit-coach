import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { radii, spacing, useTheme, type ColorToken } from "@/theme";

// The colour says the day's state at a glance: accent to act on, success for a finished day, raised to hold off
export type TodayCardTone = "accent" | "success" | "quiet";

const TONES: Record<TodayCardTone, { background: ColorToken; ink: ColorToken }> = {
  accent: { background: "accent", ink: "onAccent" },
  success: { background: "successSoft", ink: "text" },
  quiet: { background: "raised", ink: "text" },
};

type TodayCardProps = {
  tone: TodayCardTone;
  headline: string;
  line?: string;
  children?: ReactNode;
};

// One big sentence from the Coach, with what to do about it
export function TodayCard({ tone, headline, line, children }: TodayCardProps) {
  const { colors } = useTheme();
  const { background, ink } = TONES[tone];
  return (
    <View style={[styles.card, { backgroundColor: colors[background] }]}>
      <Text size="4xl" weight="extraBold" color={ink} accessibilityRole="header">
        {headline}
      </Text>
      {line ? <Text color={ink}>{line}</Text> : null}
      {children}
    </View>
  );
}

// A quiet action in a card, for what isn't the day's main action
export function TodayCardLink({
  label,
  color,
  size = "md",
  onPress,
}: {
  label: string;
  color: ColorToken;
  size?: "sm" | "md";
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text size={size} weight="semiBold" color={color}>
        {`${label} ›`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 250,
    justifyContent: "flex-end",
    gap: spacing[3],
    padding: spacing[5],
    borderRadius: radii.lg,
  },
});
