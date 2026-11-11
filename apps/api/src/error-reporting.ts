import { errorReportingConfig, MINIMAL_DATA_COLLECTION, withoutPersonalData } from "@fit/shared";
import * as Sentry from "@sentry/node";
import type { FastifyInstance } from "fastify";
import { requireAuth, userIdOf } from "./auth";

// Errors go to Sentry when SENTRY_DSN is set, tagged with SENTRY_ENVIRONMENT (production or staging). Without a DSN,
// as locally, nothing is reported. See "Error reporting" in docs/agents/workouts.md
export function initErrorReporting() {
  const config = errorReportingConfig({ dsn: process.env.SENTRY_DSN, environment: process.env.SENTRY_ENVIRONMENT });
  if (!config) return;
  Sentry.init({
    ...config,
    release: process.env.RENDER_GIT_COMMIT,
    dataCollection: MINIMAL_DATA_COLLECTION,
    beforeSend: (event) => withoutPersonalData(event),
  });
}

// Sentry's Fastify integration reports an error thrown in a route (5xx only: a 4xx is the caller's mistake) with its
// stack trace. This adds the signed-in user's Clerk id, on the request's own scope so it never leaks to another request
export function reportRouteErrorsWithUser(app: FastifyInstance) {
  app.addHook("preHandler", async (req) => {
    let userId: string | null = null;
    try {
      userId = userIdOf(req);
    } catch {
      // Clerk couldn't read the request: report its errors without a user
    }
    if (userId) Sentry.getIsolationScope().setUser({ id: userId });
  });
}

// Throws on purpose, so a deploy can be checked end to end: GET it signed in, and the error should show in Sentry
// under that deploy's environment with the user's Clerk id. Signed-in only, so it can't be used to flood Sentry
export function registerTestErrorRoute(app: FastifyInstance) {
  app.get("/debug/error", { preHandler: requireAuth }, async () => {
    throw new Error("Test error from the API (GET /debug/error)");
  });
}
