const dark = {
  // Backgrounds, page to most raised
  bg: "#0A0A0B",
  surface: "#141416",
  surfaceRaised: "#1C1C1F",
  border: "#2A2A2E",
  backdrop: "rgba(0, 0, 0, 0.6)",

  text: "#FFFFFF",
  textMuted: "#A1A1AA",
  textSubtle: "#6B6B73",
  onAccent: "#FFFFFF",

  red: "#EF2D2D",
  orange: "#FF7A1A",
  accentSoft: "rgba(255, 122, 26, 0.14)",

  success: "#22C55E",
  successSoft: "rgba(34, 197, 94, 0.14)",
  warning: "#FACC15",
  warningSoft: "rgba(250, 204, 21, 0.14)",
  danger: "#EF4444",
  dangerSoft: "rgba(239, 68, 68, 0.14)",
  info: "#60A5FA",
  infoSoft: "rgba(96, 165, 250, 0.14)",
};

// Accents are a shade deeper than dark mode so they hold contrast on white
const light: typeof dark = {
  bg: "#F6F6F7",
  surface: "#FFFFFF",
  surfaceRaised: "#EEEEF0",
  border: "#E2E2E6",
  backdrop: "rgba(0, 0, 0, 0.4)",

  text: "#0A0A0B",
  textMuted: "#52525B",
  textSubtle: "#8B8B94",
  onAccent: "#FFFFFF",

  red: "#E0242A",
  orange: "#F06A0C",
  accentSoft: "rgba(240, 106, 12, 0.12)",

  success: "#16A34A",
  successSoft: "rgba(22, 163, 74, 0.12)",
  warning: "#CA8A04",
  warningSoft: "rgba(202, 138, 4, 0.12)",
  danger: "#DC2626",
  dangerSoft: "rgba(220, 38, 38, 0.12)",
  info: "#2563EB",
  infoSoft: "rgba(37, 99, 235, 0.12)",
};

export const palettes = { light, dark } as const;

export type ColorScheme = keyof typeof palettes;
export type Colors = typeof dark;
export type ColorToken = keyof Colors;

export const accentGradient = (colors: Colors) => [colors.red, colors.orange] as const;

// Status colours shared by Alert, Badge and Toast
export type StatusAction = "success" | "warning" | "error" | "info" | "muted";

export const statusColors = (colors: Colors, action: StatusAction) =>
  ({
    success: { fg: colors.success, bg: colors.successSoft },
    warning: { fg: colors.warning, bg: colors.warningSoft },
    error: { fg: colors.danger, bg: colors.dangerSoft },
    info: { fg: colors.info, bg: colors.infoSoft },
    muted: { fg: colors.textMuted, bg: colors.surfaceRaised },
  })[action];
