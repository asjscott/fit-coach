import { describe, expect, it } from "vitest";
import { useRouteTestApi } from "../test/route-test-api";

const api = useRouteTestApi();

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

describe("PUT /check-ins/:date", () => {
  // Spec #119 story 10: the user's Check-ins reach the server, so later reviews can read them
  it("stores the user's Check-in for a local date", async () => {
    const user = await api.signIn();
    const checkIn = { sleep: 2, energy: 3, soreness: 4, checkedInAt: minutesAgo(5) };

    const stored = await user.put("/check-ins/2026-11-09", checkIn);

    expect(stored.statusCode).toBe(200);
    expect(stored.body).toEqual({ date: "2026-11-09", ...checkIn });
    expect((await user.get("/check-ins/2026-11-09")).body).toEqual({ date: "2026-11-09", ...checkIn });
  });

  // Spec #119 (#125): one Check-in per user per local date, and a later one for the same date replaces it
  it("replaces the date's Check-in with a later one, keeping one per date", async () => {
    const user = await api.signIn();
    await user.put("/check-ins/2026-11-08", { sleep: 5, energy: 5, soreness: 1, checkedInAt: minutesAgo(1500) });
    await user.put("/check-ins/2026-11-09", { sleep: 1, energy: 2, soreness: 5, checkedInAt: minutesAgo(60) });

    const later = { sleep: 4, energy: 4, soreness: 2, checkedInAt: minutesAgo(5) };
    const replaced = await user.put("/check-ins/2026-11-09", later);

    expect(replaced.body).toEqual({ date: "2026-11-09", ...later });
    expect((await user.get("/check-ins/2026-11-09")).body).toEqual({ date: "2026-11-09", ...later });
    expect((await user.get("/check-ins/2026-11-08")).body).toMatchObject({ sleep: 5, energy: 5, soreness: 1 });
  });

  // Spec #119 story 10: a queued Check-in is retried like a Pending Workout, so the same upload can arrive again
  it("stores a retried upload once: the same Check-in, 200 each time", async () => {
    const user = await api.signIn();
    const checkIn = { sleep: 3, energy: 3, soreness: 3, checkedInAt: minutesAgo(30) };

    const first = await user.put("/check-ins/2026-11-09", checkIn);
    const retry = await user.put("/check-ins/2026-11-09", checkIn);

    expect([first.statusCode, retry.statusCode]).toEqual([200, 200]);
    expect(retry.body).toEqual(first.body);
    expect((await user.get("/check-ins/2026-11-09")).body).toEqual({ date: "2026-11-09", ...checkIn });
  });

  // A retry of an earlier Check-in that arrives after the later one has uploaded never undoes it
  it("keeps the later Check-in when an earlier one for the date arrives late", async () => {
    const user = await api.signIn();
    const later = { sleep: 4, energy: 4, soreness: 2, checkedInAt: minutesAgo(5) };
    await user.put("/check-ins/2026-11-09", later);

    const late = await user.put("/check-ins/2026-11-09", {
      sleep: 1,
      energy: 1,
      soreness: 5,
      checkedInAt: minutesAgo(60),
    });

    expect(late.statusCode).toBe(200);
    expect(late.body).toEqual({ date: "2026-11-09", ...later });
    expect((await user.get("/check-ins/2026-11-09")).body).toEqual({ date: "2026-11-09", ...later });
  });

  it("keeps each user's Check-ins to themselves", async () => {
    const user = await api.signIn();
    const other = await api.signIn();
    await user.put("/check-ins/2026-11-09", { sleep: 2, energy: 2, soreness: 2, checkedInAt: minutesAgo(5) });

    expect((await other.get("/check-ins/2026-11-09")).body).toBeNull();
  });

  it("refuses a date that isn't a local date, or a rating outside 1 to 5", async () => {
    const user = await api.signIn();
    const checkIn = { sleep: 3, energy: 3, soreness: 3, checkedInAt: minutesAgo(5) };

    expect((await user.put("/check-ins/9-11-2026", checkIn)).statusCode).toBe(400);
    expect((await user.put("/check-ins/2026-11-09", { ...checkIn, sleep: 6 })).statusCode).toBe(400);
  });
});

describe("GET /check-ins/:date", () => {
  it("is null for a date the user didn't check in", async () => {
    const user = await api.signIn();

    const answer = await user.get("/check-ins/2026-11-09");

    expect(answer.statusCode).toBe(200);
    expect(answer.body).toBeNull();
  });
});
