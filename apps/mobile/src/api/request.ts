import { untilAborted } from "./until-aborted";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// How long a request waits for its token and the server's answer before giving up (#170). Going offline with a
// socket open left fetch waiting for iOS's 60 s, and Clerk's getToken retries for ever with no network
export const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// A request's init, plus how long it may take when that isn't REQUEST_TIMEOUT_MS
export type ApiInit = RequestInit & { timeoutMs?: number };

// Calls the API with the user's token. The server refusing throws an ApiError; anything else that goes wrong,
// including no answer in time, throws a plain error, which screens read as needing a connection. A caller's own
// signal still ends it sooner
export async function request(
  getToken: () => Promise<string | null>,
  path: string,
  { timeoutMs = REQUEST_TIMEOUT_MS, signal, ...init }: ApiInit = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`No answer after ${timeoutMs} ms`)), timeoutMs);
  const onCallerAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) onCallerAbort();
  else signal?.addEventListener("abort", onCallerAbort, { once: true });

  const send = async () => {
    const token = await getToken();
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    const res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: controller.signal });
    if (!res.ok) throw new ApiError(res.status, (await res.text()) || String(res.status));
    // 204 No Content, e.g. after a DELETE
    if (res.status === 204) return null;
    return res.json();
  };

  try {
    // Once aborted, nothing more is sent: the token wait, the fetch and reading its body all give up together
    if (controller.signal.aborted) throw controller.signal.reason;
    return await untilAborted(send(), controller.signal);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onCallerAbort);
  }
}
