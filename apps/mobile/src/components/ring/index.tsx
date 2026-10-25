import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { fontSizes, useTheme } from "@/theme";
import { Text } from "../text";

export type RingProps = {
  // e.g. Workouts done; the count is drawn in the centre
  done: number;
  // e.g. days per week; a full ring once done reaches it
  target: number;
  size?: number;
  stroke?: number;
};

// Progress towards a target as an accent arc on a hairline-coloured track, with the count in the middle.
// Decorative: the text beside it says the same in words
export function Ring({ done, target, size = 44, stroke = 6 }: RingProps) {
  const { colors } = useTheme();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target > 0 ? Math.min(done, target) / target : 0;
  const fontSize = size >= 64 ? fontSizes.xl : fontSizes.sm;

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.line} strokeWidth={stroke} fill="none" />
        {progress > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.accent}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${progress * circumference} ${circumference}`}
          />
        ) : null}
      </Svg>
      <Text weight="bold" style={{ fontSize }}>
        {done}
      </Text>
    </View>
  );
}
