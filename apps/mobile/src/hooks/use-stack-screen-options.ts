import { fonts, useTheme } from "@/theme";

// Header and background options shared by every Stack in the app
export function useStackScreenOptions() {
  const { colors } = useTheme();
  return {
    contentStyle: { backgroundColor: colors.bg },
    headerShadowVisible: false,
    headerTitleStyle: { fontFamily: fonts.semiBold },
  };
}
