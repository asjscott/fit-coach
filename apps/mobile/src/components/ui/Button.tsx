import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  accentGradient,
  radii,
  spacing,
  useTheme,
  useThemedStyles,
  type Colors,
  type ColorToken,
} from "@/theme";
import { Text } from "./Text";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = Omit<PressableProps, "style" | "children"> & {
  title: string;
  variant?: ButtonVariant;
  size?: "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const textColors: Record<ButtonVariant, ColorToken> = {
  primary: "onAccent",
  secondary: "text",
  ghost: "textMuted",
  danger: "onAccent",
};

export function Button({
  title,
  variant = "primary",
  size = "lg",
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isDisabled = disabled || loading;
  const textColor = textColors[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {variant === "primary" && (
        <LinearGradient
          colors={accentGradient(colors)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {loading ? (
        <ActivityIndicator color={colors[textColor]} />
      ) : (
        <Text variant={size === "lg" ? "bodyStrong" : "label"} color={textColor}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    base: {
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      borderRadius: radii.md,
      overflow: "hidden",
    },
    md: { height: 44, paddingHorizontal: spacing.lg },
    lg: { height: 56, paddingHorizontal: spacing.xl },
    primary: {},
    secondary: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    ghost: { backgroundColor: "transparent" },
    danger: { backgroundColor: colors.danger },
    fullWidth: { alignSelf: "stretch" },
    pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    disabled: { opacity: 0.45 },
  });
