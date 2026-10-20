import { useAuth } from "@clerk/expo";
import { useCallback } from "react";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function useApi() {
  const { getToken } = useAuth();

  return useCallback(
    async (path: string, init: RequestInit = {}): Promise<unknown> => {
      const token = await getToken();
      const headers = new Headers(init.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const res = await fetch(`${API_URL}${path}`, { ...init, headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    },
    [getToken],
  );
}
