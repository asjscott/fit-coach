import { describe, expect, it } from "vitest";
import { hostedAuthRedirectUrl } from "./hosted-auth-redirect";

// Stands in for expo-linking's createURL as Expo Go builds it
const expoGoUrl = (path: string) => `exp://192.168.1.20:8081/--/${path}`;

describe("hostedAuthRedirectUrl", () => {
  it("returns to Expo Go through an exp:// link when running in Expo Go", () => {
    expect(hostedAuthRedirectUrl({ inExpoGo: true, createURL: expoGoUrl })).toBe(
      "exp://192.168.1.20:8081/--/hosted-auth-callback",
    );
  });

  it("leaves Clerk's default return link alone outside Expo Go", () => {
    expect(hostedAuthRedirectUrl({ inExpoGo: false, createURL: expoGoUrl })).toBeUndefined();
  });
});
