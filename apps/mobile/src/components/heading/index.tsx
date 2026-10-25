import { fonts, fontSizes, lineHeight } from "@/theme";
import { Text, type TextProps } from "../text";
import { headingFontSize, type HeadingSize } from "./styles";

export type HeadingProps = Omit<TextProps, "size"> & { size?: HeadingSize };

export function Heading({ size = "lg", bold = true, weight, style, ...props }: HeadingProps) {
  const fontSize = fontSizes[headingFontSize[size]];
  // Inter bold throughout; display sizes track tighter
  const isDisplay = fontSize >= fontSizes["3xl"];

  return (
    <Text
      accessibilityRole="header"
      style={[
        {
          fontFamily: fonts[weight ?? (bold ? "bold" : "regular")],
          fontSize,
          lineHeight: lineHeight(fontSize, true),
          letterSpacing: isDisplay ? -0.6 : -0.2,
        },
        style,
      ]}
      {...props}
    />
  );
}
