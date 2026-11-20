import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, REQUEST_TIMEOUT_MS, request } from "./request";

const never = <T>() => new Promise<T>(() => {});
const token = async () => "token";

// A fetch that answers when the request's signal aborts, as React Native's does, and otherwise never
const hangingFetch = () =>
  vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) =>
        init.signal?.addEventListener("abort", () => reject(new TypeError("Aborted"))),
      ),
  );

describe("request", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("answers the JSON, sending the token", async () => {
    const fetchStub = vi.fn(async () => new Response('{"ok":true}'));
    vi.stubGlobal("fetch", fetchStub);
    await expect(request(token, "/days/2026-11-20")).resolves.toEqual({ ok: true });
    const [, init] = fetchStub.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token");
  });

  it("throws an ApiError when the server refuses", async () => {
    vi.stubGlobal("fetch", async () => new Response("Not found", { status: 404 }));
    const refused = request(token, "/foods/x");
    await expect(refused).rejects.toBeInstanceOf(ApiError);
    await expect(refused).rejects.toMatchObject({ status: 404 });
  });

  // Going offline with a socket open left fetch waiting for iOS's 60 s (#170), so every request ends on its own, and
  // not as an ApiError, which is how screens tell "needs a connection" from a refusal
  it("gives up on a fetch that never answers, and aborts it", async () => {
    const fetchStub = hangingFetch();
    vi.stubGlobal("fetch", fetchStub);
    const waiting = request(token, "/foods/search?q=egg");
    const failed = expect(waiting).rejects.toThrow(`No answer after ${REQUEST_TIMEOUT_MS} ms`);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await failed;
    await expect(waiting).rejects.not.toBeInstanceOf(ApiError);
    const [, init] = fetchStub.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.signal?.aborted).toBe(true);
  });

  // Clerk's getToken keeps retrying with no network, so the time limit covers the wait for it too
  it("gives up on a token that never arrives, within the same time", async () => {
    const fetchStub = vi.fn();
    vi.stubGlobal("fetch", fetchStub);
    const waiting = request(never, "/days/2026-11-20");
    const failed = expect(waiting).rejects.toThrow(`No answer after ${REQUEST_TIMEOUT_MS} ms`);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await failed;
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("waits up to the request's own timeoutMs", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    let settled = false;
    const waiting = request(token, "/tell-the-coach", { method: "POST", timeoutMs: 40_000 });
    waiting.catch(() => (settled = true));
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(40_000 - REQUEST_TIMEOUT_MS);
    await expect(waiting).rejects.toThrow("No answer after 40000 ms");
  });

  // Previous Sets gives up after 4 s, and search when the words change
  it("gives up when the caller's own signal aborts first", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const controller = new AbortController();
    const waiting = request(token, "/workouts/previous-sets?slug=squat", { signal: controller.signal });
    const failed = expect(waiting).rejects.toThrow("superseded");
    controller.abort(new Error("superseded"));
    await failed;
  });

  it("gives up at once on a signal that has already aborted", async () => {
    const fetchStub = vi.fn();
    vi.stubGlobal("fetch", fetchStub);
    const controller = new AbortController();
    controller.abort(new Error("superseded"));
    await expect(request(token, "/foods/search?q=egg", { signal: controller.signal })).rejects.toThrow("superseded");
    expect(fetchStub).not.toHaveBeenCalled();
  });
});
