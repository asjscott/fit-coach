import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useRef } from "react";
import { untilAborted, withinMs } from "./until-aborted";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TOKEN_TIMEOUT_MS = 10_000;

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

  return useCallback(async (path: string, init: RequestInit = {}): Promise<unknown> => {
    // With no signal, Clerk's getToken keeps retrying instead of failing. A request's own signal (Previous Sets' 4 s)
    // covers this wait too, and every request gives up on it in the end, like a fetch with no network would
    const token = await untilAborted(withinMs(getTokenRef.current(), TOKEN_TIMEOUT_MS), init.signal);
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(`${API_URL}${path}`, { ...init, headers });
    if (!res.ok) throw new ApiError(res.status, (await res.text()) || String(res.status));
    // 204 No Content, e.g. after a DELETE
    if (res.status === 204) return null;
    return res.json();
  }, []);
}
