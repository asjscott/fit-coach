import type { Day, User } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { ONBOARDED_PROFILE, useRouteTestApi } from "../test/route-test-api";

const api = useRouteTestApi();

// ONBOARDED_PROFILE is 80 kg, 180 cm, born 1990, male, building muscle and lightly active. On a 2026 date its BMR is
// 10 × 80 + 6.25 × 180 − 5 × 36 + 5 = 1,750 kcal, and maintenance 1,750 × 1.375 = 2,406.25
const localDate = (timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(new Date());

describe("GET /days/:date", () => {
  // Spec #158 stories 20 to 30: Daily Targets from the profile, with nothing eaten yet
  it("answers the signed-in user's Daily Targets for the day, with nothing eaten", async () => {
    const user = await api.signIn();

    const { statusCode, body } = await user.get("/days/2026-11-18");

    expect(statusCode).toBe(200);
    expect(body).toEqual({
      date: "2026-11-18",
      // 2,406.25 × 1.1 = 2,646.875; carbs (2,650 − 160 × 4 − 64 × 9) ÷ 4 = 358.5; water 35 ml × 80 = 2,800
      targets: { kcal: 2650, proteinG: 160, fatG: 64, carbsG: 359, fibreG: 106, waterMl: 2750 },
      totals: { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fibreG: 0 },
      waterMl: 0,
    });
  });

  it("works the age out from the day's year", async () => {
    const user = await api.signIn();

    // 37 in 2027: 1,745 × 1.375 × 1.1 = 2,639.3
    expect(((await user.get("/days/2027-01-01")).body as Day).targets.kcal).toBe(2640);
  });

  // Story 4: a user with no Activity Level counts as lightly active until they answer
  it("counts a user who has no Activity Level as lightly active", async () => {
    // Sent as JSON, an undefined Activity Level is left out, as it is for a user onboarded before it existed
    const unanswered = await api.signIn({ profile: { ...ONBOARDED_PROFILE, activityLevel: undefined } });

    expect(((await unanswered.get("/days/2026-11-18")).body as Day).targets.kcal).toBe(2650);
  });

  // Story 30: the targets change as soon as the Goal, Activity Level or fibre target does
  it("follows a change of Goal, Activity Level or fibre target straight away", async () => {
    const user = await api.signIn();
    const targets = async () => ((await user.get("/days/2026-11-18")).body as Day).targets;

    await user.patch("/user", { profile: { goal: "lose_fat" } });
    // 2,406.25 × 0.8 = 1,925, halves up
    expect(await targets()).toMatchObject({ kcal: 1930, proteinG: 160 });

    await user.patch("/user", { profile: { activityLevel: "very_active" } });
    // 1,750 × 1.725 × 0.8 = 2,415, halves up
    expect((await targets()).kcal).toBe(2420);

    await user.patch("/user", { profile: { fibreTargetG: 30 } });
    expect((await targets()).fibreG).toBe(30);

    await user.patch("/user", { profile: { fibreTargetG: null } });
    // 40 g per 1,000 kcal of 2,420
    expect((await targets()).fibreG).toBe(97);
  });

  // Story 77: "today" is today in the user's timezone. Kiritimati (UTC+14) and Pago Pago (UTC−11) are always on
  // different dates
  it("answers today in the user's timezone", async () => {
    const east = await api.signIn();
    const west = await api.signIn();
    await east.patch("/user", { timeZone: "Pacific/Kiritimati" });
    await west.patch("/user", { timeZone: "Pacific/Pago_Pago" });

    expect(((await east.get("/days/today")).body as Day).date).toBe(localDate("Pacific/Kiritimati"));
    expect(((await west.get("/days/today")).body as Day).date).toBe(localDate("Pacific/Pago_Pago"));
  });

  it("refuses a date that isn't a local date or today", async () => {
    const user = await api.signIn();

    expect((await user.get("/days/18-11-2026")).statusCode).toBe(400);
  });

  it("is refused before onboarding, when there's nothing to work the targets out from", async () => {
    const user = await api.signIn({ onboarded: false });

    expect((await user.get("/days/today")).statusCode).toBe(403);
  });
});

describe("PATCH /user", () => {
  // Spec #158 stories 1, 9 and 10: the Activity Level and the fibre target are saved, and the fibre target cleared
  it("saves the Activity Level and the fibre target, and clears the fibre target with null", async () => {
    const user = await api.signIn();

    await user.patch("/user", { profile: { activityLevel: "active", fibreTargetG: 45 } });
    expect(((await user.get("/user")).body as User).profile).toMatchObject({
      activityLevel: "active",
      fibreTargetG: 45,
    });

    await user.patch("/user", { profile: { fibreTargetG: null } });
    expect(((await user.get("/user")).body as User).profile).not.toHaveProperty("fibreTargetG");
  });

  it("refuses an unknown Activity Level or a fibre target out of range", async () => {
    const user = await api.signIn();

    expect((await user.patch("/user", { profile: { activityLevel: "athlete" } })).statusCode).toBe(400);
    expect((await user.patch("/user", { profile: { fibreTargetG: 5 } })).statusCode).toBe(400);
  });
});
