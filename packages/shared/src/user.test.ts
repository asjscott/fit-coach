import { describe, expect, it } from "vitest";
import {
  DayLength,
  OnboardingProfile,
  User,
  UserProfile,
  UserUpdate,
  WORKOUT_LENGTH_MINUTES,
  WorkoutLength,
} from "./user";

const onboardingAnswers = {
  gender: "female",
  birthYear: 1990,
  heightCm: 170,
  weightKg: 65,
  goal: "recomp",
  daysPerWeek: 3,
};

const user = { id: "u1", profile: {}, onboardedAt: null, equipmentProfiles: [] };

describe("WorkoutLength", () => {
  it("is Short, Standard or Long at 30, 45 or 60 minutes", () => {
    expect(WorkoutLength.options).toEqual(["short", "standard", "long"]);
    expect(WORKOUT_LENGTH_MINUTES).toMatchObject({ short: 30, standard: 45, long: 60 });
  });

  it("can't be Quick, which is only for one Workout", () => {
    expect(WorkoutLength.safeParse("quick").success).toBe(false);
    expect(UserProfile.partial().safeParse({ workoutLength: "quick" }).success).toBe(false);
    expect(UserUpdate.safeParse({ profile: { workoutLength: "quick" } }).success).toBe(false);
    expect(OnboardingProfile.safeParse({ ...onboardingAnswers, workoutLength: "quick" }).success).toBe(false);
  });
});

describe("DayLength", () => {
  it("is Quick at 20 minutes, then the usual Lengths, shortest to longest", () => {
    expect(DayLength.options).toEqual(["quick", "short", "standard", "long"]);
    expect(WORKOUT_LENGTH_MINUTES).toEqual({ quick: 20, short: 30, standard: 45, long: 60 });
  });

  it("refuses any other length", () => {
    expect(WorkoutLength.safeParse("medium").success).toBe(false);
    expect(UserUpdate.safeParse({ profile: { workoutLength: 45 } }).success).toBe(false);
  });
});

describe("OnboardingProfile", () => {
  it.each(["short", "standard", "long"])("accepts a Workout Length of %s", (workoutLength) => {
    expect(OnboardingProfile.safeParse({ ...onboardingAnswers, workoutLength }).success).toBe(true);
  });

  it("requires a Workout Length", () => {
    const result = OnboardingProfile.safeParse(onboardingAnswers);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([["workoutLength"]]);
  });
});

describe("User", () => {
  it("keeps a stored profile from before Workout Length, onboarded as it was", () => {
    const stored = User.parse({
      id: "u1",
      profile: onboardingAnswers,
      onboardedAt: "2026-01-05T09:00:00.000Z",
      equipmentProfiles: [],
    });
    expect(stored.onboardedAt).toBe("2026-01-05T09:00:00.000Z");
    expect(stored.profile.workoutLength).toBeUndefined();
  });

  it("parses a user whose phone hasn't sent a timezone yet", () => {
    expect(User.safeParse(user).success).toBe(true);
  });

  it("keeps the timezone", () => {
    expect(User.parse({ ...user, timeZone: "Pacific/Auckland" }).timeZone).toBe("Pacific/Auckland");
  });
});

// User story 18: every load shows in the unit the user chose, lb by default
describe("User's unit", () => {
  it("is lb for a user who has never chosen, new or existing", () => {
    expect(User.parse(user).unit).toBe("lb");
  });

  it("keeps the unit the user chose", () => {
    expect(User.parse({ ...user, unit: "kg" }).unit).toBe("kg");
  });

  it("can be changed, to lb or kg only", () => {
    expect(UserUpdate.safeParse({ unit: "kg" }).success).toBe(true);
    expect(UserUpdate.safeParse({ unit: "stone" }).success).toBe(false);
  });
});

describe("UserUpdate", () => {
  it("lets a user change Workout Length alone", () => {
    expect(UserUpdate.parse({ profile: { workoutLength: "long" } }).profile).toEqual({ workoutLength: "long" });
  });

  it("takes a timezone alone", () => {
    expect(UserUpdate.safeParse({ timeZone: "America/New_York" }).success).toBe(true);
  });

  it("refuses a timezone that doesn't exist, which would break every week worked out from it", () => {
    expect(UserUpdate.safeParse({ timeZone: "Mars/Olympus_Mons" }).success).toBe(false);
  });
});
