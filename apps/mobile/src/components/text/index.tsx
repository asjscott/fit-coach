import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import {
  fonts,
  fontSizes,
  lineHeight,
  useTheme,
  type ColorToken,
  type FontSize,
  type FontWeight,
} from "@/theme";
import { decorationStyles } from "./styles";

export type TextProps = RNTextProps & {
  size?: FontSize;
  color?: ColorToken;
  bold?: boolean;
  weight?: FontWeight;
  underline?: boolean;
  strikeThrough?: boolean;
  italic?: boolean;
  sub?: boolean;
  highlight?: boolean;
  centered?: boolean;
  isTruncated?: boolean;
  // Fixed-width digits so changing numbers (weights, reps, timers) don't jitter
  tabular?: boolean;
};

export function Text({
  size = "md",
  color = "text",
  bold = false,
  weight,
  underline,
  strikeThrough,
  italic,
  sub,
  highlight,
  centered,
  isTruncated,
  tabular,
  style,
  numberOfLines,
  ...props
}: TextProps) {
  const { colors } = useTheme();
  const fontSize = fontSizes[sub ? "xs" : size];

  return (
    <RNText
      numberOfLines={isTruncated ? 1 : numberOfLines}
      style={[
        {
          fontFamily: fonts[weight ?? (bold ? "bold" : "regular")],
          fontSize,
          lineHeight: lineHeight(fontSize),
          color: colors[color],
          textAlign: centered ? "center" : undefined,
          backgroundColor: highlight ? colors.accentSoft : undefined,
          fontVariant: tabular ? ["tabular-nums"] : undefined,
        },
        underline && decorationStyles.underline,
        strikeThrough && decorationStyles.strikeThrough,
        italic && decorationStyles.italic,
        style,
      ]}
      {...props}
    />
  );
}
