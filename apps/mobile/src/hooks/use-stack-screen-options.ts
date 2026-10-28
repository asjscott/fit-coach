import { fonts, useTheme } from "@/theme";

// Header and background options shared by every Stack in the app
export function useStackScreenOptions() {
  const { colors } = useTheme();
  return {
    contentStyle: { backgroundColor: colors.bg },
    // Left unset, iOS 26 makes the header a translucent Liquid Glass bar with content laid out under it (#45)
    headerTransparent: false,
    headerShadowVisible: false,
    headerTitleStyle: { fontFamily: fonts.semiBold },
  };
}
