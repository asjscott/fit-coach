import type { TextStyle } from "react-native";

// Keys must match the font names registered with useFonts in the root layout
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extraBold: "Inter_800ExtraBold",
} as const;

export const textVariants = {
  display: { fontFamily: fonts.extraBold, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  // Fixed-width digits so weights/reps don't jitter when they change
  numeric: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, fontVariant: ["tabular-nums"] },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textVariants;
