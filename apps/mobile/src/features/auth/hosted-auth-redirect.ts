// Where Account Portal hands back to after a native sign-in; Clerk reads the link, so no screen shows it
export const HOSTED_AUTH_CALLBACK = "hosted-auth-callback";

// Expo Go only receives exp:// links, and Clerk can't tell it's in Expo Go on Android, where Expo Go reports
// executionEnvironment "bare" (#44). Undefined keeps Clerk's default
export function hostedAuthRedirectUrl({
  inExpoGo,
  hostUri,
}: {
  inExpoGo: boolean;
  // The dev server's address, e.g. "10.0.0.6:8081"
  hostUri: string | undefined;
}): string | undefined {
  return inExpoGo && hostUri ? `exp://${hostUri}/--/${HOSTED_AUTH_CALLBACK}` : undefined;
}
