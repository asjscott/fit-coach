import type { FontSize } from "@/theme";

export type HeadingSize = Exclude<FontSize, "6xl">;

// Headings run one step larger than the same Text size
export const headingFontSize: Record<HeadingSize, FontSize> = {
  "2xs": "xs",
  xs: "sm",
  sm: "md",
  md: "lg",
  lg: "xl",
  xl: "2xl",
  "2xl": "3xl",
  "3xl": "4xl",
  "4xl": "5xl",
  "5xl": "6xl",
};
