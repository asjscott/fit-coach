import type { EquipmentProfileInput } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { DUMBBELLS_AT_HOME, useRouteTestApi } from "../test/route-test-api";
import { assessedUser, at, upload, workingLevels } from "../test/uploads";
import { lifted } from "../test/workouts";

const api = useRouteTestApi();

// Home with dumbbells and kettlebells of 8 to 24 kg in 4 kg steps, so the swing has Load Steps to take
const DUMBBELLS_AND_KETTLEBELLS: EquipmentProfileInput = {
  ...DUMBBELLS_AT_HOME,
  tags: [...DUMBBELLS_AT_HOME.tags, "kettlebells"],
  loads: { ...DUMBBELLS_AT_HOME.loads, kettlebells: { weightsKg: [8, 12, 16, 20, 24] } },
};

const swingsAt = (kg: number, rpe?: number) => [lifted(kg, 8), lifted(kg, 8), lifted(kg, 8, rpe)];

// Stories 60, 61: the swing, a weighted Ballistic Exercise, at a fixed 8 reps
describe("Ballistic Exercises at upload (#136)", () => {
  async function swinger() {
    const user = await assessedUser(api, { equipmentProfile: DUMBBELLS_AND_KETTLEBELLS });
    const seeded = (await workingLevels(user)).get("kettlebell-swing");
    if (seeded?.unit !== "kg") throw new Error("the swing has no weighted Working Level");
    return { user, kg: seeded.kg };
  }

  it("goes up a Load Step when every Set reaches 8 and the last Set's RPE is 7 or lower", async () => {
    const { user, kg } = await swinger();
    await upload(user, at(100, [{ slug: "kettlebell-swing", sets: swingsAt(kg, 7) }]));

    expect((await workingLevels(user)).get("kettlebell-swing")).toMatchObject({
      kg: kg + 4,
      reps: 8,
      change: { code: "load-up" },
    });
  });

  it("holds the load when the last Set's RPE is 8", async () => {
    const { user, kg } = await swinger();
    await upload(user, at(100, [{ slug: "kettlebell-swing", sets: swingsAt(kg, 8) }]));

    expect((await workingLevels(user)).get("kettlebell-swing")).toMatchObject({ kg, reps: 8 });
  });

  it("goes up at most once every 3 Workouts without RPE", async () => {
    const { user, kg } = await swinger();
    await upload(user, at(150, [{ slug: "kettlebell-swing", sets: swingsAt(kg) }]));
    await upload(user, at(125, [{ slug: "kettlebell-swing", sets: swingsAt(kg) }]));
    expect((await workingLevels(user)).get("kettlebell-swing")).toMatchObject({ kg });

    await upload(user, at(100, [{ slug: "kettlebell-swing", sets: swingsAt(kg) }]));
    expect((await workingLevels(user)).get("kettlebell-swing")).toMatchObject({ kg: kg + 4, reps: 8 });

    await upload(user, at(75, [{ slug: "kettlebell-swing", sets: swingsAt(kg + 4) }]));
    expect((await workingLevels(user)).get("kettlebell-swing")).toMatchObject({ kg: kg + 4 });
  });

  it("never counts a retried upload twice towards the 3", async () => {
    const { user, kg } = await swinger();
    const first = at(150, [{ slug: "kettlebell-swing", sets: swingsAt(kg) }]);
    await upload(user, first);
    expect((await user.post("/workouts", first)).statusCode).toBe(200);
    await upload(user, at(125, [{ slug: "kettlebell-swing", sets: swingsAt(kg) }]));

    expect((await workingLevels(user)).get("kettlebell-swing")).toMatchObject({ kg });
  });
});

// Story 63: the farmer's carry moves only by the load the user logs
describe("carries at upload (#136)", () => {
  async function carrier() {
    const user = await assessedUser(api);
    const seeded = (await workingLevels(user)).get("farmers-carry");
    if (seeded?.unit !== "kg") throw new Error("the carry has no weighted Working Level");
    return { user, seeded };
  }

  it("moves to a different load the user logs, keeping its reps", async () => {
    const { user, seeded } = await carrier();
    const lighter = seeded.kg - 4;
    await upload(user, at(100, [{ slug: "farmers-carry", sets: [lifted(lighter, 30), lifted(lighter, 30)] }]));

    expect((await workingLevels(user)).get("farmers-carry")).toMatchObject({
      kg: lighter,
      reps: seeded.reps,
      change: { code: "new-base" },
    });
  });

  it("takes no part in double progression or Misses at the same load", async () => {
    const { user, seeded } = await carrier();
    await upload(user, at(150, [{ slug: "farmers-carry", sets: [lifted(seeded.kg, 40), lifted(seeded.kg, 40)] }]));
    await upload(user, at(125, [{ slug: "farmers-carry", sets: [lifted(seeded.kg, 1), lifted(seeded.kg, 1)] }]));
    await upload(user, at(100, [{ slug: "farmers-carry", sets: [lifted(seeded.kg, 1), lifted(seeded.kg, 1)] }]));

    expect((await workingLevels(user)).get("farmers-carry")).toMatchObject({
      kg: seeded.kg,
      reps: seeded.reps,
      misses: 0,
    });
  });
});
