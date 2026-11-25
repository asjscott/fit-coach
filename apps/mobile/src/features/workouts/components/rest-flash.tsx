import { useEffect, useState } from "react";
import { Animated, Platform, StyleSheet } from "react-native";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/theme";
import { useLogbook } from "../logbook-provider";

// The Workout's screens flash twice as a rest ends (#179) or a hold reaches its target (#196), unless the user asks for reduced motion
export function RestFlash() {
  const { restFlashing } = useLogbook();
  const reducedMotion = useReducedMotion();
  return restFlashing && !reducedMotion ? <Flash /> : null;
}

function Flash() {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const pulse = () => Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: Platform.OS !== "web" });
    const again = Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: Platform.OS !== "web" });
    const flash = Animated.sequence([pulse(), again, pulse()]);
    flash.start();
    return () => flash.stop();
  }, [opacity]);

  return <Animated.View style={[styles.flash, { backgroundColor: colors.accent, opacity }]} />;
}

const styles = StyleSheet.create({
  // Taps go through to the next Set's steppers
  flash: { ...StyleSheet.absoluteFill, zIndex: 1, pointerEvents: "none" },
});
