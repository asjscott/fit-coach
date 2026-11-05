import { describe, expect, it } from "vitest";
import { User, UserUpdate } from "./user";

const user = { id: "u1", profile: {}, onboardedAt: null, equipmentProfiles: [] };

describe("User", () => {
  it("parses a user whose phone hasn't sent a timezone yet", () => {
    expect(User.safeParse(user).success).toBe(true);
  });

  it("keeps the timezone", () => {
    expect(User.parse({ ...user, timeZone: "Pacific/Auckland" }).timeZone).toBe("Pacific/Auckland");
  });
});

describe("UserUpdate", () => {
  it("takes a timezone alone", () => {
    expect(UserUpdate.safeParse({ timeZone: "America/New_York" }).success).toBe(true);
  });

  it("still takes profile fields alone", () => {
    expect(UserUpdate.safeParse({ profile: { goal: "recomp" } }).success).toBe(true);
  });

  it("refuses a timezone that doesn't exist, which would break every week worked out from it", () => {
    expect(UserUpdate.safeParse({ timeZone: "Mars/Olympus_Mons" }).success).toBe(false);
  });
});
