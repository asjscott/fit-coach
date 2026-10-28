// Rewrites links that open the app before expo-router routes them.
// On Android the hosted sign-in's return link (hosted-auth-callback) also reaches the router, which has no such
// route. Clerk reads the link itself, so it stays on Sign in, which moves on once the session is active (#44)
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return path.includes("hosted-auth-callback") ? "/sign-in" : path;
}
