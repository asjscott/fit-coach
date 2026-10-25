// The Performance-led palette (spec #16): neutrals, one solid accent, and danger for destructive actions.
// colors.test.ts checks every pairing the components draw against WCAG AA
const dark = {
  // Backgrounds, page to most raised
  bg: "#0D0E10",
  surface: "#17181B",
  raised: "#202227",
  // Hairline separators; decorative, so they stay subtle
  line: "#2A2C31",
  // Outlines the user must see: inputs, checkboxes, radios
  inputBorder: "#6E727B",
  backdrop: "rgba(0, 0, 0, 0.6)",
  // Drop shadows under floating pieces, such as toasts and slider thumbs
  shadow: "#000000",

  text: "#F4F5F7",
  muted: "#A9ACB3",
  subtle: "#8E929A",

  accent: "#FC5200",
  onAccent: "#0D0E10",
  // Opaque tints, so their contrast doesn't depend on what's behind them
  accentSoft: "#321F18",

  danger: "#FF6B57",
  dangerSoft: "#372423",
};

const light: typeof dark = {
  bg: "#F7F7F8",
  surface: "#FFFFFF",
  raised: "#EDEEF0",
  line: "#E2E3E6",
  inputBorder: "#8A8D95",
  backdrop: "rgba(0, 0, 0, 0.4)",
  shadow: "#000000",

  text: "#121316",
  muted: "#4A4D55",
  subtle: "#6B6E76",

  accent: "#C2410C",
  onAccent: "#FFFFFF",
  accentSoft: "#FAF0EC",

  danger: "#B91C1C",
  dangerSoft: "#F9EDED",
};

export const palettes = { light, dark } as const;

export type ColorScheme = keyof typeof palettes;
export type Colors = typeof dark;
export type ColorToken = keyof Colors;

// Status colours shared by Alert, Badge and Toast. One accent, so success and warning share it
export type StatusAction = "success" | "warning" | "error" | "info" | "muted";

export const statusColors = (colors: Colors, action: StatusAction) =>
  ({
    success: { fg: colors.accent, bg: colors.accentSoft },
    warning: { fg: colors.accent, bg: colors.accentSoft },
    error: { fg: colors.danger, bg: colors.dangerSoft },
    info: { fg: colors.muted, bg: colors.raised },
    muted: { fg: colors.muted, bg: colors.raised },
  })[action];
