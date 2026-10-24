import * as Network from "expo-network";
import { useEffect } from "react";
import { AppState } from "react-native";

// Calls sync when the app returns to the foreground and when the network comes back
export function useSyncTriggers(sync: () => void) {
  useEffect(() => {
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    let wasConnected: boolean | undefined;
    const network = Network.addNetworkStateListener(({ isConnected }) => {
      if (isConnected && wasConnected === false) sync();
      wasConnected = isConnected;
    });
    return () => {
      appState.remove();
      network.remove();
    };
  }, [sync]);
}
