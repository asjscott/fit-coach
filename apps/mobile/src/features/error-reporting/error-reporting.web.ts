import { errorReportingConfig, MINIMAL_DATA_COLLECTION, withoutPersonalData } from "@fit/shared";
import * as Sentry from "@sentry/react";

// The web app reports uncaught errors to Sentry when EXPO_PUBLIC_SENTRY_DSN is set at build time, tagged with
// EXPO_PUBLIC_SENTRY_ENVIRONMENT (production or staging). Without a DSN, as locally, nothing is reported. The native
// build uses error-reporting.ts, which reports nothing. See "Error reporting" in docs/agents/workouts.md
const config = errorReportingConfig({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
});

// Pages are also rendered in Node at export, where there is nothing to report
if (config && typeof window !== "undefined") {
  Sentry.init({
    ...config,
    dataCollection: MINIMAL_DATA_COLLECTION,
    // Console messages and the text of what was tapped can carry a Workout or a name, so neither is kept
    integrations: (defaults) => [
      ...defaults.filter((integration) => integration.name !== "Console"),
      Sentry.breadcrumbsIntegration({ dom: false }),
    ],
    beforeSend: (event) => withoutPersonalData(event),
  });
}

// The signed-in user's Clerk id, the only personal data an event carries; null when signed out
export function setErrorReportingUser(clerkUserId: string | null) {
  if (config) Sentry.setUser(clerkUserId ? { id: clerkUserId } : null);
}
