import { describe, expect, it } from "vitest";
import { extendRest, restSeconds, restSecondsLeft, startRest } from "./rest-timer";

const at = (iso: string) => new Date(iso);

describe("restSeconds", () => {
  it("rests 30 seconds less than a Set takes", () => {
    expect(restSeconds(180)).toBe(150);
  });

  it("never rests under 45 seconds", () => {
    expect(restSeconds(60)).toBe(45);
  });
});

describe("startRest", () => {
  it("gives a goblet squat 1:30 and a back squat 2:30", () => {
    expect(startRest("goblet-squat", at("2026-11-09T10:00:00Z")).endsAt).toBe(Date.parse("2026-11-09T10:01:30Z"));
    expect(startRest("back-squat", at("2026-11-09T10:00:00Z")).endsAt).toBe(Date.parse("2026-11-09T10:02:30Z"));
  });

  it("gives an Exercise this app version doesn't know the library's typical rest", () => {
    expect(startRest("not-in-the-library", at("2026-11-09T10:00:00Z")).endsAt).toBe(Date.parse("2026-11-09T10:01:15Z"));
  });
});

describe("restSecondsLeft", () => {
  const rest = startRest("back-squat", at("2026-11-09T10:00:00Z"));

  it("counts down to the end time, however long the app was in the background", () => {
    // Backgrounded at 10:00:10 and back at 10:02:00, with no ticks in between
    expect(restSecondsLeft(rest, at("2026-11-09T10:02:00Z"))).toBe(30);
  });

  it("rounds a part second up, so it shows 0 only at the end", () => {
    expect(restSecondsLeft(rest, at("2026-11-09T10:02:29.200Z"))).toBe(1);
  });

  it("stops at 0 once the rest is over", () => {
    expect(restSecondsLeft(rest, at("2026-11-09T10:05:00Z"))).toBe(0);
  });
});

describe("extendRest", () => {
  it("adds 15 seconds to the current rest", () => {
    const rest = startRest("back-squat", at("2026-11-09T10:00:00Z"));
    expect(restSecondsLeft(extendRest(rest), at("2026-11-09T10:02:00Z"))).toBe(45);
  });

  it("leaves the next rest its usual length", () => {
    extendRest(startRest("back-squat", at("2026-11-09T10:00:00Z")));
    expect(startRest("back-squat", at("2026-11-09T10:03:00Z")).endsAt).toBe(Date.parse("2026-11-09T10:05:30Z"));
  });
});
