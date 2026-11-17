import { describe, expect, it } from "vitest";
import { toKg } from "./units";
import {
  bodyWeightAnswer,
  bodyWeightInUnit,
  bodyWeightKg,
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

// #148: body weight follows "Weights in" like every load, and is still stored in kg
describe("body weight in the user's unit", () => {
  it("shows a body weight entered in pounds back as entered", () => {
    expect(bodyWeightInUnit(toKg(180, "lb"), "lb")).toBe(180);
    expect(bodyWeightInUnit(toKg(165.5, "lb"), "lb")).toBe(165.5);
  });

  it("shows a body weight entered in kg in pounds, to a tenth", () => {
    expect(bodyWeightInUnit(80, "lb")).toBe(176.4);
  });

  it("shows a body weight entered in kg as entered", () => {
    expect(bodyWeightInUnit(80, "kg")).toBe(80);
    expect(bodyWeightInUnit(72.3, "kg")).toBe(72.3);
  });
});

describe("asking for body weight in the user's unit", () => {
  const error = (value: unknown, unit: "lb" | "kg") =>
    bodyWeightAnswer(unit).safeParse(value).error?.issues[0]?.message;

  it("takes a body weight in pounds that is within the kg range", () => {
    expect(error(180, "lb")).toBeUndefined();
    expect(error(78, "lb")).toBeUndefined();
    expect(error(551, "lb")).toBeUndefined();
  });

  it("says the range in pounds when a body weight in pounds is out of it", () => {
    expect(error(60, "lb")).toBe("Must be 78 lb or more");
    expect(error(600, "lb")).toBe("Must be 551 lb or less");
  });

  it("says the range in kg when a body weight in kg is out of it", () => {
    expect(error(80, "kg")).toBeUndefined();
    expect(error(30, "kg")).toBe("Must be 35 kg or more");
    expect(error(260, "kg")).toBe("Must be 250 kg or less");
  });

  it("asks for a body weight left blank", () => {
    expect(error(undefined, "lb")).toBe("Enter your weight");
  });

  // #154: a number field stores an emptied field as null
  it("asks for a body weight that was emptied", () => {
    expect(error(null, "lb")).toBe("Enter your weight");
  });
});

// #154: a number field stores an emptied field as null
describe("asking for a height or birth year that was emptied", () => {
  const error = (field: "heightCm" | "birthYear") => UserProfile.shape[field].safeParse(null).error?.issues[0]?.message;

  it("asks for each again", () => {
    expect(error("heightCm")).toBe("Enter your height");
    expect(error("birthYear")).toBe("Enter your birth year");
  });
});

describe("saving a body weight answered in the user's unit", () => {
  it("stores a body weight answered in pounds as its exact kg", () => {
    expect(bodyWeightKg(180, "lb")).toBe(toKg(180, "lb"));
  });

  it("stores a body weight answered in kg as answered", () => {
    expect(bodyWeightKg(80, "kg")).toBe(80);
  });

  it("keeps the stored body weight when the answer shown for it is saved unchanged", () => {
    // 80 kg shows as 176.4 lb; saving that back would store 80.01 kg
    expect(bodyWeightKg(176.4, "lb", 80)).toBe(80);
  });

  it("stores a changed body weight in place of the stored one", () => {
    expect(bodyWeightKg(170, "lb", 80)).toBe(toKg(170, "lb"));
  });
});
