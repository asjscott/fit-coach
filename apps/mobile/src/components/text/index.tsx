import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";
import { fonts, fontSizes, lineHeight, useTheme, type ColorToken, type FontSize, type FontWeight } from "@/theme";
import { decorationStyles } from "./styles";

// Every number the user sees has fixed-width digits, so weights, reps and timers line up and don't jitter
export const TABULAR: TextStyle["fontVariant"] = ["tabular-nums"];

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
          fontVariant: TABULAR,
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
