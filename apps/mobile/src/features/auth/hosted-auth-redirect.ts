// The return link to pass to Clerk's startHostedAuth, or undefined to keep Clerk's default.
// Expo Go only receives exp:// links, not the app's mobile:// scheme, so in Expo Go the Account Portal hands back to
// the dev server's exp://…/--/hosted-auth-callback. Clerk and Linking.createURL can't be left to build it: they spot
// Expo Go by Constants.executionEnvironment, which Expo Go on Android reports as "bare" (#44)
export function hostedAuthRedirectUrl({
  inExpoGo,
  hostUri,
}: {
  inExpoGo: boolean;
  // The dev server's address, e.g. "10.0.0.6:8081"
  hostUri: string | undefined;
}): string | undefined {
  return inExpoGo && hostUri ? `exp://${hostUri}/--/hosted-auth-callback` : undefined;
}
