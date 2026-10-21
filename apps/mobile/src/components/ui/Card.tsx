import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { radii, spacing, useThemedStyles, type Colors } from "@/theme";

export type CardProps = {
  children: ReactNode;
  // Supplying onPress makes the card tappable (e.g. an option in a picker)
  onPress?: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, onPress, selected = false, style }: CardProps) {
  const styles = useThemedStyles(createStyles);
  const cardStyle = [styles.card, selected && styles.selected, style];

  if (!onPress) return <View style={cardStyle}>{children}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    selected: { borderColor: colors.orange, backgroundColor: colors.accentSoft },
    pressed: { opacity: 0.85 },
  });
