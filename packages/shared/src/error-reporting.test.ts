import { describe, expect, it } from "vitest";
import { errorReportingConfig, withoutPersonalData } from "./error-reporting";

// User story 9: errors from the web app and the API reach Sentry, tagged production or staging (#122)
describe("errorReportingConfig", () => {
  it("reports nothing when no DSN is configured, so the app runs locally without one", () => {
    expect(errorReportingConfig({})).toBeNull();
    expect(errorReportingConfig({ dsn: "", environment: "staging" })).toBeNull();
    expect(errorReportingConfig({ dsn: "   " })).toBeNull();
  });

  it("tags events with the configured environment", () => {
    expect(errorReportingConfig({ dsn: "https://key@o1.ingest.sentry.io/2", environment: "staging" })).toEqual({
      dsn: "https://key@o1.ingest.sentry.io/2",
      environment: "staging",
    });
    expect(errorReportingConfig({ dsn: "https://key@o1.ingest.sentry.io/2", environment: "production" })).toEqual({
      dsn: "https://key@o1.ingest.sentry.io/2",
      environment: "production",
    });
  });

  it("never tags an event production unless told to", () => {
    expect(errorReportingConfig({ dsn: "https://key@o1.ingest.sentry.io/2" })?.environment).toBe("development");
  });
});

describe("withoutPersonalData", () => {
  it("keeps only the Clerk user id of the user", () => {
    const event = withoutPersonalData({
      user: { id: "user_123", email: "a@example.com", username: "a", ip_address: "1.2.3.4" },
    });
    expect(event.user).toEqual({ id: "user_123" });
  });

  it("drops the request's headers, cookies, body and query, which can carry the session token or a Workout", () => {
    const event = withoutPersonalData({
      request: {
        url: "https://api.example.com/workouts",
        method: "POST",
        headers: { Authorization: "Bearer secret" },
        cookies: { __session: "secret" },
        data: '{"weightKg":80}',
        query_string: "token=secret",
        env: { REMOTE_ADDR: "1.2.3.4" },
      },
    });
    expect(event.request).toEqual({ url: "https://api.example.com/workouts", method: "POST" });
  });

  it("leaves the error and its stack trace alone", () => {
    const exception = { values: [{ type: "Error", value: "boom", stacktrace: { frames: [{ function: "f" }] } }] };
    const event = { exception, environment: "staging", user: { id: "user_123" } };
    expect(withoutPersonalData(event)).toEqual({ exception, environment: "staging", user: { id: "user_123" } });
  });
});
