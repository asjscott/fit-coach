import { localDateOf, loggableDates, mondayOfDate, weekdayOf } from "@fit/engines";
import { bodyWeightInUnit, User } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { type TestUser, useRouteTestApi } from "../test/route-test-api";
import { assessedUser, workingLevels } from "../test/uploads";

const api = useRouteTestApi();

// Test users are in UTC until they send a timezone
const today = () => localDateOf(new Date(), "UTC");

const userOf = async (user: TestUser) => User.parse((await user.get("/user")).body);

describe("the first Weigh-in", () => {
  // Spec #158: onboarding's weight becomes a new user's first Weigh-in
  it("is the weight given at onboarding, dated the day they onboarded", async () => {
    const user = await api.signIn();

    const { latestWeighIn, weighedInThisWeek } = await userOf(user);

    expect(latestWeighIn).toEqual({ date: today(), kg: 80 });
    expect(weighedInThisWeek).toBe(true);
  });

  it("isn't there before onboarding", async () => {
    const user = await api.signIn({ onboarded: false });

    expect(await userOf(user)).toMatchObject({ latestWeighIn: null, weighedInThisWeek: false });
  });
});

// This week's Monday, always one of the last 7 days. Today itself on a Monday
const firstDateThisWeek = () => mondayOfDate(today());

// A timezone where today isn't a Sunday, so the last 7 days reach into last week. When it's Sunday in UTC, it's
// already Monday at UTC+14 from 10:00 UTC, and still Saturday at UTC−11 until 11:00 UTC
const notSundayTimeZone = () =>
  ["UTC", "Pacific/Kiritimati", "Pacific/Pago_Pago"].find(
    (timeZone) => weekdayOf(localDateOf(new Date(), timeZone)) !== "sunday",
  )!;

describe("PUT /weigh-ins/:date", () => {
  // Spec #158 story 16: a second Weigh-in in the same week replaces the first, so each week has one number
  it("keeps one Weigh-in per week, a later one replacing it", async () => {
    const user = await api.signIn();
    await user.put(`/weigh-ins/${today()}`, { weight: 82, unit: "kg" });

    const replaced = await user.put(`/weigh-ins/${firstDateThisWeek()}`, { weight: 81, unit: "kg" });

    expect(replaced.statusCode).toBe(200);
    // Were both kept, today's would be the latest
    expect(User.parse(replaced.body)).toMatchObject({
      latestWeighIn: { date: firstDateThisWeek(), kg: 81 },
      weighedInThisWeek: true,
    });
    expect((await userOf(user)).latestWeighIn).toEqual({ date: firstDateThisWeek(), kg: 81 });
  });

  // Spec #158 story 17: a forgotten Weigh-in Day still counts for its own week
  it("logs a Weigh-in for any of the last 7 days into that day's week", async () => {
    const user = await api.signIn();
    const timeZone = notSundayTimeZone();
    await user.patch("/user", { timeZone });
    const [localToday, , , , , , sixDaysBefore] = loggableDates(new Date(), timeZone);
    await user.put(`/weigh-ins/${localToday}`, { weight: 82, unit: "kg" });

    const lastWeek = await user.put(`/weigh-ins/${sixDaysBefore}`, { weight: 79, unit: "kg" });

    expect(lastWeek.statusCode).toBe(200);
    // Last week's doesn't replace this week's, which is still the latest
    expect((await userOf(user)).latestWeighIn).toEqual({ date: localToday, kg: 82 });
  });
});

// A calendar date this many days from another
const daysFrom = (date: string, days: number) => {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
};

describe("refusing a Weigh-in", () => {
  // Spec #158 story 17: today or the 6 days before it, in the user's timezone
  it("refuses a date outside the last 7 days", async () => {
    const user = await api.signIn();

    for (const date of [daysFrom(today(), -7), daysFrom(today(), 1)]) {
      expect((await user.put(`/weigh-ins/${date}`, { weight: 70, unit: "kg" })).statusCode).toBe(400);
    }
    expect((await userOf(user)).latestWeighIn).toEqual({ date: today(), kg: 80 });
  });

  it("refuses a weight outside the profile's range, in the unit it was entered in", async () => {
    const user = await api.signIn();

    expect((await user.put(`/weigh-ins/${today()}`, { weight: 30, unit: "kg" })).statusCode).toBe(400);
    expect((await user.put(`/weigh-ins/${today()}`, { weight: 600, unit: "lb" })).statusCode).toBe(400);
    expect((await user.put(`/weigh-ins/${today()}`, { weight: 80, unit: "stone" })).statusCode).toBe(400);
  });

  it("refuses a Weigh-in before onboarding", async () => {
    const user = await api.signIn({ onboarded: false });

    expect((await user.put(`/weigh-ins/${today()}`, { weight: 80, unit: "kg" })).statusCode).toBe(403);
  });
});

describe("the latest Weigh-in is the body weight", () => {
  // Spec #158 stories 11 and 18: the profile's weight and the Daily Targets follow the latest Weigh-in
  it("keeps the profile's weight and the Daily Targets at the latest Weigh-in", async () => {
    const user = await api.signIn();

    await user.put(`/weigh-ins/${today()}`, { weight: 90, unit: "kg" });

    expect((await userOf(user)).profile.weightKg).toBe(90);
    // 90 kg building muscle, lightly active: BMR 10 × 90 + 6.25 × 180 − 5 × 36 + 5 = 1,850; × 1.375 × 1.1 = 2,798
    // kcal, protein 2.0 g × 90, water 35 ml × 90 = 3,150 rounded to 3,250
    expect((await user.get("/days/today")).body).toMatchObject({
      targets: { kcal: 2800, proteinG: 180, waterMl: 3250 },
    });
  });

  // Spec #158 story 15: what the scale said, in the user's unit
  it("reads 180 lb entered back as 180 lb", async () => {
    const user = await api.signIn();
    await user.patch("/user", { unit: "lb" });

    await user.put(`/weigh-ins/${today()}`, { weight: 180, unit: "lb" });

    const { latestWeighIn, profile } = await userOf(user);
    expect(bodyWeightInUnit(latestWeighIn!.kg, "lb")).toBe(180);
    expect(bodyWeightInUnit(profile.weightKg!, "lb")).toBe(180);
  });

  // Spec #158 story 19: body weight is read only at an Assessment
  it("never moves the Working Levels", async () => {
    const user = await assessedUser(api);
    const before = await workingLevels(user);

    await user.put(`/weigh-ins/${today()}`, { weight: 95, unit: "kg" });

    expect(await workingLevels(user)).toEqual(before);
  });

  // Spec #158: the profile's weight is read-only once onboarded, so there's one place it comes from
  it("refuses a weight sent with the profile once onboarded", async () => {
    const user = await api.signIn();

    expect((await user.patch("/user", { profile: { weightKg: 70 } })).statusCode).toBe(400);
    expect((await userOf(user)).profile.weightKg).toBe(80);
  });

  it("keeps each user's Weigh-ins to themselves", async () => {
    const user = await api.signIn();
    const other = await api.signIn();

    await user.put(`/weigh-ins/${today()}`, { weight: 70, unit: "kg" });

    expect((await userOf(other)).latestWeighIn).toEqual({ date: today(), kg: 80 });
    expect((await userOf(other)).profile.weightKg).toBe(80);
  });
});

describe("the Weigh-in Day", () => {
  // Spec #158 story 8
  it("is saved and read back with the profile", async () => {
    const user = await api.signIn();

    await user.patch("/user", { profile: { weighInDay: "thursday" } });

    expect((await userOf(user)).profile.weighInDay).toBe("thursday");
    expect((await user.patch("/user", { profile: { weighInDay: "someday" } })).statusCode).toBe(400);
  });
});

describe("migrateWeighIns", () => {
  // Spec #158 story 5: an existing user's stored weight becomes their first Weigh-in, in the week they onboarded
  it("gives a user onboarded before Weigh-ins a first one from their stored weight", async () => {
    const user = await api.signIn();

    await forgetWeighInsAndMigrate(user);

    expect((await userOf(user)).latestWeighIn).toEqual({ date: today(), kg: 80 });
  });

  it("leaves a user's Weigh-ins as they are when they have some", async () => {
    const user = await api.signIn();
    await user.put(`/weigh-ins/${today()}`, { weight: 84, unit: "kg" });

    const { migrateWeighIns } = await import("../weigh-ins");
    await migrateWeighIns();

    expect((await userOf(user)).latestWeighIn).toEqual({ date: today(), kg: 84 });
  });
});

// Removes the user's Weigh-ins, as for a user onboarded before there were any, then runs the migration. Imported here,
// not at the top, as the database client reads MONGODB_URI when it loads
async function forgetWeighInsAndMigrate(user: TestUser) {
  const { db } = await import("../db");
  const { migrateWeighIns } = await import("../weigh-ins");
  await db.collection("weighIns").deleteMany({ clerkUserId: user.id });
  await migrateWeighIns();
}
