import type { EquipmentProfile } from "@fit/shared";
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
    expect(equipmentSummary(profile({ tags: ["dumbbells", "adjustable_bench", "pull_up_bar"] }))).toBe(
      "Dumbbells, Adjustable bench, Pull-up bar",
    );
  });

  it("says a gym has everything rather than listing every item", () => {
    expect(equipmentSummary(profile({ name: "Gym", location: "gym", tags: ["dumbbells", "barbell"] }))).toBe(
      "Full gym",
    );
  });

  it("says when there's no equipment", () => {
    expect(equipmentSummary(profile({ name: "No equipment", tags: [] }))).toBe("No equipment");
  });

  it("says when the user has no equipment profile yet", () => {
    expect(equipmentSummary(undefined)).toBe("Not set");
  });
});
