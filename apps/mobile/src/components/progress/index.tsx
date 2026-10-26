import { createContext, use, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { radii, useTheme } from "@/theme";

const heights = { xs: 2, sm: 4, md: 6, lg: 8, xl: 12, "2xl": 16 } as const;

const ProgressContext = createContext<{ value: number } | null>(null);

export type ProgressProps = {
  // 0 to 100
  value: number;
  size?: keyof typeof heights;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Progress({ value, size = "md", style, children }: ProgressProps) {
  const { colors } = useTheme();
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <ProgressContext value={{ value: clamped }}>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: clamped }}
        style={[
          { height: heights[size], borderRadius: radii.pill, backgroundColor: colors.line, overflow: "hidden" },
          style,
        ]}
      >
        {children}
      </View>
    </ProgressContext>
  );
}

export function ProgressFilledTrack() {
  const { colors } = useTheme();
  const context = use(ProgressContext);
  if (!context) throw new Error("ProgressFilledTrack must be used inside <Progress>");
  return <View style={[StyleSheet.absoluteFill, { width: `${context.value}%`, backgroundColor: colors.accent }]} />;
}
