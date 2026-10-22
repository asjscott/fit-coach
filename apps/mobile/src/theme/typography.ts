// Keys must match the font names registered with useFonts in the root layout
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extraBold: "Inter_800ExtraBold",
} as const;

export type FontWeight = keyof typeof fonts;

export const fontSizes = {
  "2xs": 10,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
  "6xl": 60,
} as const;

export type FontSize = keyof typeof fontSizes;

// Body copy breathes more than headings
export const lineHeight = (fontSize: number, tight = false) =>
  Math.round(fontSize * (tight ? 1.2 : 1.45));
