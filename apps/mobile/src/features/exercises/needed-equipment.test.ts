import { EXERCISES, type ProfileWithLoads } from "@fit/engines";
import { describe, expect, it } from "vitest";
import { neededEquipment } from "./needed-equipment";

const needed = (slug: string, profile: ProfileWithLoads) =>
  neededEquipment(
    EXERCISES.find((e) => e.slug === slug)!,
    profile,
  );

describe("neededEquipment", () => {
  it("names each way of doing it that the profile lacks", () => {
    expect(needed("goblet-squat", { tags: [], loads: {} })).toBe("Dumbbells or Kettlebells");
  });

  // Story 49 of #176
  it("asks for two dumbbells when there's a bar for only one", () => {
    const oneBar: ProfileWithLoads = {
      tags: ["dumbbells"],
      loads: { dumbbells: { kind: "bar_and_plates", barKg: 2, bars: 1, plates: [] } },
    };
    expect(needed("dumbbell-floor-press", oneBar)).toBe("Two dumbbells or Kettlebells");
  });
});
