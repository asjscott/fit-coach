import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useRef } from "react";
import { request, type ApiInit } from "./request";

export { ApiError, type ApiInit } from "./request";

export function useApi() {
  const { getToken } = useAuth();

  // Clerk returns a new getToken every render; keep it in a ref so the
  // function returned here stays stable and is safe to use in effect deps.
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  return useCallback((path: string, init?: ApiInit) => request(() => getTokenRef.current(), path, init), []);
}
