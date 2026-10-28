import { fonts, useTheme } from "@/theme";

// Header and background options shared by every Stack in the app
export function useStackScreenOptions() {
  const { colors } = useTheme();
  return {
    contentStyle: { backgroundColor: colors.bg },
    // On iOS 26 the header defaults to a translucent Liquid Glass bar that content scrolls under.
    // Screens lay out from the top of their view (`Screen` drops the "top" edge under a header),
    // so keep the header opaque and the content below it.
    headerTransparent: false,
    headerShadowVisible: false,
    headerTitleStyle: { fontFamily: fonts.semiBold },
  };
}
