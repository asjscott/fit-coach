/**
 * The return link to pass to Clerk's `startHostedAuth`, or undefined to keep Clerk's default.
 *
 * Expo Go only receives `exp://` links, not the app's own `mobile://` scheme, so in Expo Go
 * the hosted Account Portal must hand back to an `exp://…/--/hosted-auth-callback` link
 * (see #44). Dev builds and production keep Clerk's default return link.
 * The Clerk dev instance must allow the Expo Go link as a redirect: see "Signing in from Expo Go" in README.md.
 */
export function hostedAuthRedirectUrl({
  inExpoGo,
  createURL,
}: {
  inExpoGo: boolean;
  createURL: (path: string) => string;
}): string | undefined {
  return inExpoGo ? createURL("hosted-auth-callback") : undefined;
}
