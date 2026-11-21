import type { Day } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { localDate } from "../test/dates";
import { useRouteTestApi } from "../test/route-test-api";

const api = useRouteTestApi();

describe("PUT /days/:date/water", () => {
  // Spec #158 story 46: the glasses set the day's water, which the day route reads back
  it("sets the day's water, and the day reads it back", async () => {
    const user = await api.signIn();
    const today = localDate("UTC");
    const water = async (date: string) => ((await user.get(`/days/${date}`)).body as Day).waterMl;

    const set = await user.put(`/days/${today}/water`, { waterMl: 750 });

    expect(set).toMatchObject({ statusCode: 200, body: { date: today, waterMl: 750 } });
    expect(await water(today)).toBe(750);
    // Each date has its own water
    expect(await water(localDate("UTC", 1))).toBe(0);
  });

  // Story 46 and the spec's write routes: an empty glass sends the total + 250, a filled one the total − 250, and a
  // repeated tap's request changes nothing
  it("steps up and down by 250 ml, and a repeated request is harmless", async () => {
    const user = await api.signIn();
    const water = async () => ((await user.get("/days/today")).body as Day).waterMl;

    await user.put(`/days/${localDate("UTC")}/water`, { waterMl: 250 });
    await user.put(`/days/${localDate("UTC")}/water`, { waterMl: 500 });
    await user.put(`/days/${localDate("UTC")}/water`, { waterMl: 500 });
    expect(await water()).toBe(500);

    await user.put(`/days/${localDate("UTC")}/water`, { waterMl: 250 });
    expect(await water()).toBe(250);
    await user.put(`/days/${localDate("UTC")}/water`, { waterMl: 0 });
    expect(await water()).toBe(0);
  });

  it("refuses an amount that isn't whole glasses", async () => {
    const user = await api.signIn();

    for (const waterMl of [100, -250, 2.5]) {
      expect((await user.put(`/days/${localDate("UTC")}/water`, { waterMl })).statusCode).toBe(400);
    }
  });

  // "Every write": today or one of the 6 days before it, in the user's timezone
  it("sets water for today or the 6 days before it, and refuses any other date", async () => {
    const user = await api.signIn();
    await user.patch("/user", { timeZone: "Pacific/Kiritimati" });
    const put = (daysBefore: number) =>
      user.put(`/days/${localDate("Pacific/Kiritimati", daysBefore)}/water`, { waterMl: 250 });

    expect((await put(0)).statusCode).toBe(200);
    expect((await put(6)).statusCode).toBe(200);
    const tooOld = await put(7);
    expect(tooOld.statusCode).toBe(400);
    expect(tooOld.body).toMatchObject({ message: "Water must be from the last 7 days" });
    expect((await put(-1)).statusCode).toBe(400);
  });

  it("never shows another user's water", async () => {
    const drinker = await api.signIn();
    const other = await api.signIn();

    await drinker.put(`/days/${localDate("UTC")}/water`, { waterMl: 1000 });

    expect(((await other.get("/days/today")).body as Day).waterMl).toBe(0);
  });
});
