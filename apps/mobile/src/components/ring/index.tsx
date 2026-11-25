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
  // Words for the middle in place of the count, such as the kcal left, drawn smaller so they fit
  centre?: string;
  color?: "accent" | "success" | "danger";
  // How full a second lap in danger is, 0 to 1, drawn over the first once the target is passed
  lap?: number;
};

// Progress towards a target as an arc, accent unless told otherwise, on a hairline-coloured track, with the count in
// the middle. Decorative: the text beside it says the same in words
export function Ring({ done, target, size = 44, stroke = 6, centre, color = "accent", lap = 0 }: RingProps) {
  const { colors } = useTheme();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target > 0 ? Math.max(0, Math.min(done, target)) / target : 0;
  const fontSize = size >= 64 && centre === undefined ? fontSizes.xl : fontSizes.sm;

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
            stroke={colors[color]}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${progress * circumference} ${circumference}`}
          />
        ) : null}
        {lap > 0
          ? // The first, wider arc leaves a gap round the lap, so it stands out from the one under it in shape too
            [colors.bg, colors.danger].map((arcColor, i) => (
              <Circle
                key={arcColor}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={arcColor}
                strokeWidth={i ? stroke : stroke + 4}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${Math.min(lap, 1) * circumference} ${circumference}`}
              />
            ))
          : null}
      </Svg>
      <Text weight="bold" style={{ fontSize }}>
        {centre ?? done}
      </Text>
    </View>
  );
}
