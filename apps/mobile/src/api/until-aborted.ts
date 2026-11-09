// Waits for promise, but gives up after ms
export function withinMs<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`Gave up after ${ms} ms`)), ms);
  return untilAborted(promise, controller.signal).finally(() => clearTimeout(timer));
}

// Waits for promise, but gives up when signal aborts. Clerk's getToken takes no signal and keeps retrying with no
// network, so a request's timeout has to cover the wait for its token as well as the fetch.
export function untilAborted<T>(promise: Promise<T>, signal?: AbortSignal | null): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (err: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}
