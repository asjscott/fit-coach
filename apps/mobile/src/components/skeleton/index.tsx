import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, View, type StyleProp, type ViewStyle } from "react-native";
import { radii, spacing, useTheme, type SpaceToken } from "@/theme";

const variantRadius = { rounded: radii.sm, sharp: 0, circular: radii.pill } as const;

// Shared pulse so every skeleton on screen breathes together
function usePulse(speed: number) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const duration = 3000 / speed;
    const easing = Easing.bezier(0.4, 0, 0.6, 1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: duration / 2, easing, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: duration / 2, easing, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, speed]);
  return opacity;
}

export type SkeletonProps = {
  variant?: keyof typeof variantRadius;
  isLoaded?: boolean;
  speed?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Skeleton({ variant = "rounded", isLoaded = false, speed = 2, style, children }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = usePulse(speed);
  if (isLoaded) return <>{children}</>;
  return (
    <Animated.View
      style={[{ backgroundColor: colors.surfaceRaised, borderRadius: variantRadius[variant], opacity }, style]}
    />
  );
}

export type SkeletonTextProps = {
  _lines?: number;
  gap?: SpaceToken;
  isLoaded?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function SkeletonText({ _lines = 1, gap = 2, isLoaded = false, style, children }: SkeletonTextProps) {
  if (isLoaded) return <>{children}</>;
  return (
    <View style={{ gap: spacing[gap] }}>
      {Array.from({ length: _lines }, (_, i) => (
        // Last line shorter, like real paragraph text
        <Skeleton key={i} style={[{ height: 12, width: i === _lines - 1 && _lines > 1 ? "60%" : "100%" }, style]} />
      ))}
    </View>
  );
}
