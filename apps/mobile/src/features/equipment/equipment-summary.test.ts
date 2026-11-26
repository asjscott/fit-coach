import { toKg, type EquipmentProfile } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { equipmentSummary } from "./equipment-summary";

const profile = (overrides: Partial<EquipmentProfile>): EquipmentProfile => ({
  id: "p1",
  name: "Home",
  location: "home",
  isPrimary: true,
  tags: [],
  loads: {},
  ...overrides,
});

describe("equipmentSummary", () => {
  it("lists a home profile's equipment by name", () => {
    expect(equipmentSummary(profile({ tags: ["dumbbells", "adjustable_bench", "pull_up_bar"] }), "lb")).toBe(
      "Dumbbells, Adjustable bench, Pull-up bar",
    );
  });

  // Story 38 of #176
  describe("with bar-and-plates dumbbells", () => {
    const withBar = (bars: number, plates: [size: number, count: number][]) =>
      profile({
        tags: ["dumbbells", "adjustable_bench"],
        loads: {
          dumbbells: {
            kind: "bar_and_plates",
            barKg: toKg(4, "lb"),
            bars,
            plates: plates.map(([size, count]) => ({ kg: toKg(size, "lb"), count })),
          },
        },
      });

    it("describes the bars and how many of each plate", () => {
      const summary = equipmentSummary(
        withBar(2, [
          [5, 4],
          [3, 4],
        ]),
        "lb",
      );
      expect(summary).toBe("Dumbbells (2 × 4 lb bars, 4 × 3 lb and 4 × 5 lb plates), Adjustable bench");
    });

    it("describes one bar with no plates", () => {
      expect(equipmentSummary(withBar(1, []), "lb")).toBe("Dumbbells (1 × 4 lb bar), Adjustable bench");
    });

    it("shows a size to the hundredth in the user's unit", () => {
      expect(equipmentSummary(withBar(1, [[2.2, 1]]), "lb")).toContain("1 × 2.2 lb plate)");
      expect(equipmentSummary(withBar(1, [[2.2, 2]]), "kg")).toContain("(1 × 1.81 kg bar, 2 × 1 kg plates)");
    });
  });

  it("says a gym has everything rather than listing every item", () => {
    expect(equipmentSummary(profile({ name: "Gym", location: "gym", tags: ["dumbbells", "barbell"] }), "lb")).toBe(
      "Full gym",
    );
  });

  it("says when there's no equipment", () => {
    expect(equipmentSummary(profile({ name: "No equipment", tags: [] }), "lb")).toBe("No equipment");
  });

  it("says when the user has no equipment profile yet", () => {
    expect(equipmentSummary(undefined, "lb")).toBe("Not set");
  });
});
