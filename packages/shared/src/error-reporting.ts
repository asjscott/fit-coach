// Error reporting to Sentry, shared by the web app and the API. Typed by shape so this package needs no Sentry SDK

export type ErrorReportingConfig = { dsn: string; environment: string };

// Null when no DSN is configured: the app then reports nothing, as it does locally. Without an environment the
// events say "development", so a misconfigured deploy never passes for production
export function errorReportingConfig(env: { dsn?: string; environment?: string }): ErrorReportingConfig | null {
  const dsn = env.dsn?.trim();
  if (!dsn) return null;
  return { dsn, environment: env.environment?.trim() || "development" };
}

// Sentry's dataCollection option: collect nothing about the user or the request beyond what an error needs. Local
// variables are left out too, as they can hold a Workout or a token. withoutPersonalData backs this up in beforeSend
export const MINIMAL_DATA_COLLECTION: {
  userInfo: false;
  cookies: false;
  httpHeaders: false;
  httpBodies: never[];
  urlQueryParams: false;
  databaseQueryData: false;
  stackFrameVariables: false;
} = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  stackFrameVariables: false,
};

type ReportedEvent = {
  user?: { id?: string | number };
  request?: { url?: string; method?: string };
};

// For beforeSend: nothing personal leaves but the Clerk user id. Request headers carry the session token, and bodies
// and query strings carry Workouts, so only the URL and method of a request are kept
export function withoutPersonalData<E extends ReportedEvent>(event: E): E {
  const scrubbed: E = { ...event };
  if (event.user) scrubbed.user = event.user.id === undefined ? {} : { id: event.user.id };
  if (event.request) {
    const { url, method } = event.request;
    scrubbed.request = { ...(url !== undefined && { url }), ...(method !== undefined && { method }) };
  }
  return scrubbed;
}
