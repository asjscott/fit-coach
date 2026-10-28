import { HOSTED_AUTH_CALLBACK } from "@/features/auth/hosted-auth-redirect";

// On Android the sign-in's return link also reaches the router, which has no such route. Sign in moves on once
// Clerk has read it (#44)
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return path.includes(HOSTED_AUTH_CALLBACK) ? "/sign-in" : path;
}
