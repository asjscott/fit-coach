import type { Day } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { dayRings } from "./day-rings";

// Ranges of 2,520 to 2,780 kcal and 144 to 192 g of protein
const day = (eaten: Partial<Day["totals"]> = {}, waterMl = 0): Day => ({
  date: "2026-11-18",
  targets: { kcal: 2650, proteinG: 160, fatG: 64, carbsG: 359, fibreG: 106, waterMl: 2750 },
  totals: { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fibreG: 0, ...eaten },
  meals: [],
  waterMl,
  ideas: [],
  ideaMeal: "lunch",
});

describe("dayRings", () => {
  // Spec #188 story 3: kcal and protein count down to the bottom of their ranges; fibre and water count up
  it("shows what's left to be in range with nothing eaten, and no fibre or water yet", () => {
    const accent = { progress: 0, color: "accent", lap: 0 };
    expect(dayRings(day())).toEqual([
      {
        key: "kcal",
        centre: "2,520",
        caption: "kcal left",
        label: "2,520 kcal left to be in range, 2,520 to 2,780",
        ...accent,
      },
      {
        key: "protein",
        centre: "144",
        caption: "g protein left",
        label: "144 g protein left to be in range, 144 to 192",
        ...accent,
      },
      { key: "fibre", centre: "0", caption: "of 106 g fibre", label: "0 of 106 g fibre", ...accent },
      { key: "water", centre: "0", caption: "of 2.75 L", label: "0 of 2.75 L water", ...accent },
    ]);
  });

  it("below a range, fills towards its bottom", () => {
    const [kcal, protein] = dayRings(day({ kcal: 1260, proteinG: 36 }));

    expect(kcal).toMatchObject({ centre: "1,260", progress: 0.5, color: "accent", lap: 0 });
    expect(protein).toMatchObject({ centre: "108", progress: 0.25, color: "accent", lap: 0 });
  });

  // Story 4: both ends of a range are in it, from amounts rounded as shown
  it.each([
    [{ kcal: 2520, proteinG: 144 }, "2,520", "144"],
    [{ kcal: 2519.5, proteinG: 143.5 }, "2,520", "144"],
    [{ kcal: 2780, proteinG: 192 }, "2,780", "192"],
    [{ kcal: 2780.4, proteinG: 192.4 }, "2,780", "192"],
  ])("in range with %j, is full and green with the amount", (eaten, kcalShown, proteinShown) => {
    const [kcal, protein] = dayRings(day(eaten));

    expect(kcal).toMatchObject({ centre: kcalShown, caption: "kcal in range", progress: 1, color: "success", lap: 0 });
    expect(kcal.label).toBe(`${kcalShown} kcal, in range, 2,520 to 2,780`);
    expect(protein).toMatchObject({ centre: proteinShown, caption: "g protein in range", color: "success", lap: 0 });
  });

  it("is below again a whole kcal or gram under the range", () => {
    const [kcal, protein] = dayRings(day({ kcal: 2519.4, proteinG: 143 }));

    expect([kcal.centre, kcal.caption, kcal.color]).toEqual(["1", "kcal left", "accent"]);
    expect([protein.centre, protein.caption, protein.color]).toEqual(["1", "g protein left", "accent"]);
  });

  // Story 5: 3,030 is 250 past 2,780. The lap runs the 2,520 kcal from there to 5,300, and from 192 to 320 g
  it("over a range, starts a second lap and says how far over", () => {
    const [kcal, protein] = dayRings(day({ kcal: 3030, proteinG: 224 }));

    expect(kcal).toMatchObject({ centre: "250", caption: "kcal over", progress: 1, lap: 250 / 2520 });
    expect(kcal.label).toBe("250 kcal over the range, 2,520 to 2,780");
    expect(protein).toMatchObject({ centre: "32", caption: "g protein over", progress: 1, lap: 0.25 });
  });

  // Story 6
  it.each([5300, 9000])("fills the only second lap at twice the target, with %i kcal", (kcal) => {
    expect(dayRings(day({ kcal }))[0].lap).toBe(1);
  });

  it("leaves fibre and water as they were, full in accent once met", () => {
    const [, , fibre, water] = dayRings(day({ fibreG: 53.4 }, 1000));
    expect(fibre).toMatchObject({ centre: "53", progress: 53.4 / 106 });
    expect(water).toMatchObject({ centre: "1", caption: "of 2.75 L", progress: 1000 / 2750 });

    const met = dayRings(day({ fibreG: 200 }, 5000)).slice(2);
    expect(met).toMatchObject([
      { centre: "200", progress: 1, color: "accent", lap: 0 },
      { centre: "5", progress: 1, color: "accent", lap: 0 },
    ]);
  });
});
