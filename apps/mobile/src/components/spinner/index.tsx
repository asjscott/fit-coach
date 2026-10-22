import { ActivityIndicator, type ActivityIndicatorProps } from "react-native";
import { useTheme, type ColorToken } from "@/theme";

const sizeMap = {
  xs: 18,
  sm: 20,
  md: 28,
  lg: 36,
  xl: 48,
  "2xl": 64,
  "3xl": 80,
} as const;

export type SpinnerProps = Omit<ActivityIndicatorProps, "size" | "color"> & {
  size?: number | keyof typeof sizeMap;
  color?: ColorToken;
  rawColor?: string;
};

export function Spinner({ size = "sm", color = "orange", rawColor, ...props }: SpinnerProps) {
  const { colors } = useTheme();
  return (
    <ActivityIndicator
      aria-label="loading"
      size={typeof size === "number" ? size : sizeMap[size]}
      color={rawColor ?? colors[color]}
      {...props}
    />
  );
}
