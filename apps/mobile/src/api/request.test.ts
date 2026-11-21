import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  NoNetworkError,
  REQUEST_TIMEOUT_MS,
  SERVER_NOT_ANSWERING,
  noAnswerMessage,
  request,
} from "./request";

const never = <T>() => new Promise<T>(() => {});
const online = { getToken: async () => "token", noNetwork: async () => false };

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
    await expect(request(online, "/days/2026-11-20")).resolves.toEqual({ ok: true });
    const [, init] = fetchStub.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token");
  });

  it("throws an ApiError when the server refuses", async () => {
    vi.stubGlobal("fetch", async () => new Response("Not found", { status: 404 }));
    const refused = request(online, "/foods/x");
    await expect(refused).rejects.toBeInstanceOf(ApiError);
    await expect(refused).rejects.toMatchObject({ status: 404 });
  });

  // Going offline with a socket open left fetch waiting for iOS's 60 s (#170), so every request ends on its own, and
  // not as an ApiError, which is how screens tell "needs a connection" from a refusal
  it("gives up on a fetch that never answers, and aborts it", async () => {
    const fetchStub = hangingFetch();
    vi.stubGlobal("fetch", fetchStub);
    const waiting = request(online, "/foods/search?q=egg");
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
    const waiting = request({ ...online, getToken: never }, "/days/2026-11-20");
    const failed = expect(waiting).rejects.toThrow(`No answer after ${REQUEST_TIMEOUT_MS} ms`);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await failed;
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("waits up to the request's own timeoutMs", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    let settled = false;
    const waiting = request(online, "/tell-the-coach", { method: "POST", timeoutMs: 40_000 });
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
    const waiting = request(online, "/workouts/previous-sets?slug=squat", { signal: controller.signal });
    const failed = expect(waiting).rejects.toThrow("superseded");
    controller.abort(new Error("superseded"));
    await failed;
  });

  it("gives up at once on a signal that has already aborted", async () => {
    const fetchStub = vi.fn();
    vi.stubGlobal("fetch", fetchStub);
    const controller = new AbortController();
    controller.abort(new Error("superseded"));
    await expect(request(online, "/foods/search?q=egg", { signal: controller.signal })).rejects.toThrow("superseded");
    expect(fetchStub).not.toHaveBeenCalled();
  });

  // In airplane mode the phone says so, and waiting on the server only kept a spinner going (#171)
  it("makes no request when the phone has no network, failing at once as needing a connection", async () => {
    const fetchStub = vi.fn();
    const getToken = vi.fn(async () => "token");
    vi.stubGlobal("fetch", fetchStub);
    const offline = request({ getToken, noNetwork: async () => true }, "/foods/search?q=egg");
    await expect(offline).rejects.toBeInstanceOf(NoNetworkError);
    await expect(offline).rejects.not.toBeInstanceOf(ApiError);
    expect(getToken).not.toHaveBeenCalled();
    expect(fetchStub).not.toHaveBeenCalled();
  });

  // A network that's there but not working is left to the time limit
  it("asks the server when the phone can't tell whether it has a network", async () => {
    vi.stubGlobal("fetch", async () => new Response('{"ok":true}'));
    const unsure = { ...online, noNetwork: async () => Promise.reject(new Error("no native module")) };
    await expect(request(unsure, "/days/2026-11-20")).resolves.toEqual({ ok: true });
  });
});

// The server may be down while the phone is online, so only no network is called needing a connection (#174)
describe("noAnswerMessage", () => {
  const offline = "Searching for food needs a connection.";

  it("says the screen's own words when the phone has no network", () => {
    expect(noAnswerMessage(new NoNetworkError(), offline)).toBe(offline);
  });

  it("says the server isn't answering when the phone has a network but no answer came", () => {
    expect(noAnswerMessage(new Error("No answer after 15000 ms"), offline)).toBe(SERVER_NOT_ANSWERING);
    expect(noAnswerMessage(new TypeError("Network request failed"), offline)).toBe(SERVER_NOT_ANSWERING);
  });
});
