import type { EquipmentProfileInput } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { DUMBBELLS_AT_HOME, useRouteTestApi } from "../test/route-test-api";
import { assessedUser, at, currentPlan, plannedExercise, upload, workingLevels } from "../test/uploads";
import { held, lifted, repsDone } from "../test/workouts";

const api = useRouteTestApi();

// Ladders at upload (#135, ADR 0007). The user is the harness's dumbbells-at-home user, whose Assessment seeds every
// push-up variant at 3 reps (incline at 6), the hollow hold at 45 seconds, and plans the archer push-up, the top of
// the push-up ladder: incline → push-up → decline → archer
describe("bodyweight and timed ladders at upload (#135)", () => {
  // Story 53
  it("puts a bodyweight target up 1 rep when every Set reaches it", async () => {
    const user = await assessedUser(api);
    await upload(user, at(100, [{ slug: "archer-push-up", sets: [repsDone(3), repsDone(4), repsDone(3)] }]));

    expect((await workingLevels(user)).get("archer-push-up")).toMatchObject({ reps: 4 });
    expect(await plannedExercise(user, "archer-push-up")).toMatchObject({
      target: { unit: "reps", reps: 4 },
      change: { code: "target-up" },
    });
  });

  // Story 54
  it("puts a timed target up 5 seconds when every Set reaches it", async () => {
    const user = await assessedUser(api);
    await upload(user, at(100, [{ slug: "hollow-hold", sets: [held(45), held(50)] }]));

    expect((await workingLevels(user)).get("hollow-hold")).toMatchObject({
      seconds: 50,
      change: { code: "seconds-up" },
    });
  });

  // Stories 55, 56: at 15 reps on every Set the next plan gives the harder variant, from its level seeded from
  // Reference Strength, and names the Exercise it takes over from
  it("gives the harder variant at its seeded level once every Set reaches 15 reps", async () => {
    const user = await assessedUser(api);
    await upload(user, at(100, [{ slug: "decline-push-up", sets: [repsDone(15), repsDone(15), repsDone(16)] }]));

    expect((await workingLevels(user)).get("decline-push-up")).toMatchObject({ reps: 15, outgrown: true });
    expect(await plannedExercise(user, "archer-push-up")).toMatchObject({
      target: { unit: "reps", reps: 3 },
      change: { code: "harder-variant", from: "decline-push-up" },
    });
    const offered = (await currentPlan(user)).plannedExercises.flatMap(({ alternatives }) =>
      Object.values(alternatives ?? {}).flatMap((options) => options.map(({ slug }) => slug)),
    );
    expect(offered).not.toContain("decline-push-up");
  });

  // Story 57: the harder variant moving on leaves the easier one's level where the ladder left it
  it("keeps the easier variant's level after the ladder moves on", async () => {
    const user = await assessedUser(api);
    await upload(user, at(200, [{ slug: "push-up", sets: [repsDone(15), repsDone(15)] }]));
    const easier = (await workingLevels(user)).get("push-up");
    await upload(user, at(100, [{ slug: "decline-push-up", sets: [repsDone(3), repsDone(3)] }]));
    await upload(user, at(75, [{ slug: "decline-push-up", sets: [repsDone(4), repsDone(4)] }]));

    const after = await workingLevels(user);
    expect(after.get("decline-push-up")).toMatchObject({ reps: 5 });
    expect(after.get("push-up")).toEqual(easier);
  });
});

// Home with dumbbells and two tube bands, so the Assessment's dumbbell tests still apply
const DUMBBELLS_AND_BANDS: EquipmentProfileInput = {
  ...DUMBBELLS_AT_HOME,
  tags: [...DUMBBELLS_AT_HOME.tags, "tube_bands"],
  loads: { ...DUMBBELLS_AT_HOME.loads, tube_bands: { levels: ["light", "medium"] } },
};

// Stories 58, 59: the band row is seeded on the lightest band at 10 reps (10–15)
describe("band ladders at upload (#135)", () => {
  // The band isn't recorded on the Set: the one the Working Level names is assumed
  const banded = (reps: number) => lifted(1, reps);

  it("puts the target up 1 rep when every Set reaches it", async () => {
    const user = await assessedUser(api, { equipmentProfile: DUMBBELLS_AND_BANDS });
    await upload(user, at(100, [{ slug: "band-row", sets: [banded(10), banded(12)] }]));

    expect((await workingLevels(user)).get("band-row")).toMatchObject({ level: "light", reps: 11 });
  });

  it("steps to the next band, at the bottom of the range, once every Set reaches 15", async () => {
    const user = await assessedUser(api, { equipmentProfile: DUMBBELLS_AND_BANDS });
    await upload(user, at(100, [{ slug: "band-row", sets: [banded(15), banded(15)] }]));

    expect((await workingLevels(user)).get("band-row")).toMatchObject({
      level: "medium",
      reps: 10,
      change: { code: "load-up" },
    });
  });

  // As at the heaviest load (story 34): the reps climb towards 20 instead
  it("keeps to the heaviest band the profile has, putting the target up", async () => {
    const user = await assessedUser(api, { equipmentProfile: DUMBBELLS_AND_BANDS });
    await upload(user, at(100, [{ slug: "band-row", sets: [banded(15), banded(15)] }]));
    await upload(user, at(75, [{ slug: "band-row", sets: [banded(15), banded(15)] }]));

    expect((await workingLevels(user)).get("band-row")).toMatchObject({
      level: "medium",
      reps: 11,
      change: { code: "target-up" },
    });
  });
});
