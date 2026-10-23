import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useRef } from "react";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function useApi() {
  const { getToken } = useAuth();

  // Clerk returns a new getToken every render; keep it in a ref so the
  // function returned here stays stable and is safe to use in effect deps.
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  return useCallback(
    async (path: string, init: RequestInit = {}): Promise<unknown> => {
      const token = await getTokenRef.current();
      const headers = new Headers(init.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (init.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const res = await fetch(`${API_URL}${path}`, { ...init, headers });
      if (!res.ok) throw new ApiError(res.status, (await res.text()) || String(res.status));
      return res.json();
    },
    [],
  );
}
