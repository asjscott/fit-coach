import { useEffect, useState } from "react";
import { AppState } from "react-native";

// Renders the screen again when the app comes back to the front, so what reads the clock, such as the Day Summary's
// 6 pm and 10 pm edges, is checked again. No timer runs in the background
export function useRenderOnForeground() {
  const [, setShownAt] = useState(0);
  useEffect(() => {
    const listening = AppState.addEventListener("change", (state) => {
      if (state === "active") setShownAt(Date.now());
    });
    return () => listening.remove();
  }, []);
}
