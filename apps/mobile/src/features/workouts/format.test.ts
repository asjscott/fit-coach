import { describe, expect, it } from "vitest";
import { elapsedLabel } from "./format";

const startedAt = "2026-10-25T09:00:00.000Z";
const at = (time: string) => new Date(`2026-10-25T${time}Z`);

describe("elapsedLabel", () => {
  it("counts the whole minutes since the Workout started", () => {
    expect(elapsedLabel(startedAt, at("09:12:59"))).toBe("12 min");
  });

  it("switches to hours after an hour", () => {
    expect(elapsedLabel(startedAt, at("10:05:00"))).toBe("1 h 5 min");
    expect(elapsedLabel(startedAt, at("11:00:30"))).toBe("2 h");
  });

  it("reads 0 min when the phone's clock is behind the start", () => {
    expect(elapsedLabel(startedAt, at("08:58:00"))).toBe("0 min");
  });
});
