import { describe, expect, it } from "vitest";
import { hostedAuthRedirectUrl } from "./hosted-auth-redirect";

describe("hostedAuthRedirectUrl", () => {
  it("returns to Expo Go through an exp:// link to the dev server when running in Expo Go", () => {
    expect(hostedAuthRedirectUrl({ inExpoGo: true, hostUri: "10.0.0.6:8081" })).toBe(
      "exp://10.0.0.6:8081/--/hosted-auth-callback",
    );
  });

  it("leaves Clerk's default return link alone outside Expo Go", () => {
    expect(hostedAuthRedirectUrl({ inExpoGo: false, hostUri: "10.0.0.6:8081" })).toBeUndefined();
  });

  it("leaves Clerk's default alone in Expo Go when the dev server's address isn't known", () => {
    expect(hostedAuthRedirectUrl({ inExpoGo: true, hostUri: undefined })).toBeUndefined();
  });
});
