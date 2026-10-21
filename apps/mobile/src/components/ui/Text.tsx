import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";
import { textVariants, useTheme, type ColorToken, type TextVariant } from "@/theme";

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: ColorToken;
  align?: TextStyle["textAlign"];
};

export function Text({ variant = "body", color = "text", align, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      style={[textVariants[variant], { color: colors[color], textAlign: align }, style]}
      {...rest}
    />
  );
}
