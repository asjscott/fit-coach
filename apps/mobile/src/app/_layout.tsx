import { ClerkProvider, useAuth } from "@clerk/expo";
import { resourceCache } from "@clerk/expo/resource-cache";
import { tokenCache } from "@clerk/expo/token-cache";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider, Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo } from "react";
import { StatusBar } from "@/components/status-bar";
import { ToastProvider } from "@/contexts/toast-context";
import { setErrorReportingUser } from "@/features/error-reporting/error-reporting";
import { CurrentUserProvider } from "@/features/user/current-user-provider";
import { ThemeProvider, useTheme } from "@/theme";

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    // Clerk can't reach its servers on a cold start with no signal, so without the resource cache it never finishes
    // loading and the signed-in screens stay blank. With it, Clerk starts from the client and session it saved last
    // time and refreshes them once it's back online.
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache} __experimental_resourceCache={resourceCache}>
      <ErrorReportingUser />
      <CurrentUserProvider>
        <ThemeProvider>
          <ToastProvider>
            <ThemedNavigation />
          </ToastProvider>
        </ThemeProvider>
      </CurrentUserProvider>
    </ClerkProvider>
  );
}

// Errors reported to Sentry carry the signed-in user's Clerk id, and nothing else about them
function ErrorReportingUser() {
  const { userId } = useAuth();
  useEffect(() => setErrorReportingUser(userId ?? null), [userId]);
  return null;
}

// Colours used by navigation chrome (headers, screen backgrounds during transitions)
function ThemedNavigation() {
  const { scheme, colors } = useTheme();

  const navigationTheme = useMemo(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.bg,
        card: colors.bg,
        text: colors.text,
        border: colors.line,
        notification: colors.accent,
      },
    };
  }, [scheme, colors]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar />
      <Slot />
    </NavigationThemeProvider>
  );
}
