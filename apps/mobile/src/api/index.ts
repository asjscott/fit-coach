import { useAuth } from "@clerk/expo";
import * as Network from "expo-network";
import { useCallback, useEffect, useRef } from "react";
import { request, type ApiInit } from "./request";

// Only a definite "not connected" skips the server: airplane mode, or Wi-Fi and data both off
const noNetwork = async () => (await Network.getNetworkStateAsync()).isConnected === false;

export { ApiError, type ApiInit } from "./request";

export function useApi() {
  const { getToken } = useAuth();

  // Clerk returns a new getToken every render; keep it in a ref so the
  // function returned here stays stable and is safe to use in effect deps.
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  return useCallback(
    (path: string, init?: ApiInit) => request({ getToken: () => getTokenRef.current(), noNetwork }, path, init),
    [],
  );
}
