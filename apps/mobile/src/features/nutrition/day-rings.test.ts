import type { Day } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { dayRings } from "./day-rings";

const day = (eaten: Partial<Day["totals"]> = {}, waterMl = 0): Day => ({
  date: "2026-11-18",
  targets: { kcal: 2650, proteinG: 160, fatG: 64, carbsG: 359, fibreG: 106, waterMl: 2750 },
  totals: { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fibreG: 0, ...eaten },
  meals: [],
  waterMl,
});

describe("dayRings", () => {
  // Spec #158 story 32: kcal and protein count down what's left; fibre and water count up to their targets
  it("shows the targets with nothing eaten: all of the kcal and protein left, no fibre or water yet", () => {
    expect(dayRings(day())).toEqual([
      { key: "kcal", centre: "2,650", caption: "kcal left", progress: 0, label: "2,650 kcal left of 2,650" },
      { key: "protein", centre: "160", caption: "g protein left", progress: 0, label: "160 g protein left of 160" },
      { key: "fibre", centre: "0", caption: "of 106 g fibre", progress: 0, label: "0 of 106 g fibre" },
      { key: "water", centre: "0", caption: "of 2.75 L", progress: 0, label: "0 of 2.75 L water" },
    ]);
  });

  it("counts down what's eaten and fills each ring by how far it is to its target", () => {
    const [kcal, protein, fibre, water] = dayRings(day({ kcal: 1325, proteinG: 40, fibreG: 53 }, 1000));

    expect(kcal).toMatchObject({ centre: "1,325", progress: 0.5 });
    expect(protein).toMatchObject({ centre: "120", progress: 0.25 });
    expect(fibre).toMatchObject({ centre: "53", progress: 0.5 });
    expect(water).toMatchObject({ centre: "1", caption: "of 2.75 L", progress: 1000 / 2750 });
  });

  it("stops at none left and a full ring once a target is passed", () => {
    const [kcal, protein] = dayRings(day({ kcal: 2800, proteinG: 170 }));

    expect(kcal).toMatchObject({ centre: "0", progress: 1 });
    expect(protein).toMatchObject({ centre: "0", progress: 1 });
  });

  it("rounds what's eaten to whole kcal and grams", () => {
    const [kcal, protein, fibre] = dayRings(day({ kcal: 100.4, proteinG: 10.6, fibreG: 2.5 }));

    expect([kcal.centre, protein.centre, fibre.centre]).toEqual(["2,550", "149", "3"]);
  });
});
