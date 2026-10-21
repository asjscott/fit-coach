const dark = {
  // Backgrounds, page to most raised
  bg: "#0A0A0B",
  surface: "#141416",
  surfaceRaised: "#1C1C1F",
  border: "#2A2A2E",

  text: "#FFFFFF",
  textMuted: "#A1A1AA",
  textSubtle: "#6B6B73",
  onAccent: "#FFFFFF",

  red: "#EF2D2D",
  orange: "#FF7A1A",
  accentSoft: "rgba(255, 122, 26, 0.14)",

  success: "#22C55E",
  warning: "#FACC15",
  danger: "#EF4444",
};

// Accents are a shade deeper than dark mode so they hold contrast on white
const light: typeof dark = {
  bg: "#F6F6F7",
  surface: "#FFFFFF",
  surfaceRaised: "#EEEEF0",
  border: "#E2E2E6",

  text: "#0A0A0B",
  textMuted: "#52525B",
  textSubtle: "#8B8B94",
  onAccent: "#FFFFFF",

  red: "#E0242A",
  orange: "#F06A0C",
  accentSoft: "rgba(240, 106, 12, 0.12)",

  success: "#16A34A",
  warning: "#CA8A04",
  danger: "#DC2626",
};

export const palettes = { light, dark } as const;

export type ColorScheme = keyof typeof palettes;
export type Colors = typeof dark;
export type ColorToken = keyof Colors;

export const accentGradient = (colors: Colors) => [colors.red, colors.orange] as const;
