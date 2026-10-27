import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radii, spacing, statusColors, useTheme, type StatusAction } from "@/theme";
import { Icon, type IconName } from "../icons";
import { Text } from "../text";

type ToastType = Exclude<StatusAction, "muted">;

const icons: Record<ToastType, IconName> = {
  success: "circleCheck",
  error: "circleX",
  warning: "triangleAlert",
  info: "info",
};

export type ToastAction = { label: string; onPress: () => void };

export type ToastProps = {
  message: string;
  type?: ToastType;
  duration?: number;
  // A button at the end of the toast; pressing it also hides the toast
  action?: ToastAction;
  onHide?: () => void;
  isVisible: boolean;
};

// Slides down from the top, waits, then slides away and calls onHide
export function Toast({ message, type = "info", duration = 3000, action, onHide, isVisible }: ToastProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-150)).current;
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;
  const { fg, bg } = statusColors(colors, type);

  useEffect(() => {
    if (!isVisible) return;
    const animation = Animated.sequence([
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.delay(duration),
      Animated.timing(translateY, { toValue: -150, duration: 200, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => finished && onHideRef.current?.());
    return () => animation.stop();
  }, [isVisible, duration, translateY]);

  if (!isVisible) return null;

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[
        styles.container,
        { top: insets.top + spacing[2], shadowColor: colors.shadow, transform: [{ translateY }] },
      ]}
    >
      {/* Solid surface underneath so the tinted status colour stays readable */}
      <View style={[styles.toast, { backgroundColor: colors.surface, borderColor: fg }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: bg, borderRadius: radii.lg }]} />
        <Icon name={icons[type]} size={20} rawColor={fg} />
        <Text size="sm" weight="medium" numberOfLines={3} style={{ flex: 1 }}>
          {message}
        </Text>
        {action ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={spacing[2]}
            onPress={() => {
              action.onPress();
              onHideRef.current?.();
            }}
          >
            <Text size="sm" weight="semiBold" style={{ color: fg }}>
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing[4],
    right: spacing[4],
    zIndex: 1000,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
});
