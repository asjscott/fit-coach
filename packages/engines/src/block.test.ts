import { describe, expect, it } from "vitest";
import { weekOfBlock } from "./block";

// B started on Wednesday 4 November 2026, in New York
const assessment = { bStartedAt: "2026-11-04T23:00:00.000Z" };
const timeZone = "America/New_York";
const at = (iso: string) => new Date(iso);

describe("weekOfBlock", () => {
  it("is week 1 on the Monday of the week the Assessment finished", () => {
    expect(weekOfBlock(assessment, at("2026-11-02T14:00:00Z"), timeZone)).toEqual({ week: 1, deload: false });
  });

  it("is still week 1 on that week's Sunday, and week 2 the next day", () => {
    expect(weekOfBlock(assessment, at("2026-11-08T20:00:00Z"), timeZone)).toEqual({ week: 1, deload: false });
    expect(weekOfBlock(assessment, at("2026-11-09T14:00:00Z"), timeZone)).toEqual({ week: 2, deload: false });
  });

  it("makes week 5 the deload week", () => {
    expect(weekOfBlock(assessment, at("2026-11-29T20:00:00Z"), timeZone)).toEqual({ week: 4, deload: false });
    expect(weekOfBlock(assessment, at("2026-11-30T14:00:00Z"), timeZone)).toEqual({ week: 5, deload: true });
    expect(weekOfBlock(assessment, at("2026-12-06T20:00:00Z"), timeZone)).toEqual({ week: 5, deload: true });
  });

  it("starts the next Block the Monday after the deload week, with no retake", () => {
    expect(weekOfBlock(assessment, at("2026-12-07T14:00:00Z"), timeZone)).toEqual({ week: 1, deload: false });
    expect(weekOfBlock(assessment, at("2027-01-04T14:00:00Z"), timeZone)).toEqual({ week: 5, deload: true });
    expect(weekOfBlock(assessment, at("2027-01-11T14:00:00Z"), timeZone)).toEqual({ week: 1, deload: false });
  });

  it("turns the week at Monday in the user's timezone, not UTC's", () => {
    // B started on Monday 2 November in Auckland, while it was still Sunday 1 November in UTC
    const auckland = { bStartedAt: "2026-11-01T19:00:00.000Z" };
    const timeZone = "Pacific/Auckland";
    expect(weekOfBlock(auckland, at("2026-11-08T10:30:00Z"), timeZone)).toEqual({ week: 1, deload: false });
    // Monday 9 November in Auckland, still Sunday 8 November in UTC
    expect(weekOfBlock(auckland, at("2026-11-08T11:30:00Z"), timeZone)).toEqual({ week: 2, deload: false });
  });

  it("restarts at week 1 for a newer Assessment, even part-way through a Block", () => {
    expect(weekOfBlock(assessment, at("2026-11-18T14:00:00Z"), timeZone)).toEqual({ week: 3, deload: false });
    // Retaken on Tuesday 17 November
    const retake = { bStartedAt: "2026-11-17T23:00:00.000Z" };
    expect(weekOfBlock(retake, at("2026-11-18T14:00:00Z"), timeZone)).toEqual({ week: 1, deload: false });
    expect(weekOfBlock(retake, at("2026-12-14T14:00:00Z"), timeZone)).toEqual({ week: 5, deload: true });
  });

  it("is week 1 when the clock reads a week before the Assessment's", () => {
    expect(weekOfBlock(assessment, at("2026-10-28T14:00:00Z"), timeZone)).toEqual({ week: 1, deload: false });
  });

  it("is no week before the first Assessment", () => {
    expect(weekOfBlock(null, at("2026-11-02T14:00:00Z"), timeZone)).toBeNull();
  });
});
