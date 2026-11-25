import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// Whether the user asks for less motion, kept up to date. Until it's known, less
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced, () => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => subscription.remove();
  }, []);
  return reduced;
}
