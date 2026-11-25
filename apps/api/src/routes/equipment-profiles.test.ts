import { EquipmentTag, loadInUnit, toKg, type EquipmentProfileInput, type User } from "@fit/shared";
import { exerciseBySlug } from "@fit/engines";
import { describe, expect, it } from "vitest";
import { DUMBBELLS_AT_HOME, useRouteTestApi } from "../test/route-test-api";
import { assessedUser, currentPlan } from "../test/uploads";

const api = useRouteTestApi();

const GYM_WITH_CABLES: EquipmentProfileInput = {
  name: "Gym",
  location: "gym",
  isPrimary: true,
  tags: ["dumbbells", "cable_machine"],
  loads: { dumbbells: { kind: "fixed", weightsKg: [10, 12, 14] } },
};

const cableStepOf = (response: { body: unknown }) =>
  (response.body as User).equipmentProfiles.find(({ name }) => name === "Gym")?.loads.cable_machine;

// User story 23: each Equipment Profile with a cable or machine has its own Load Step, 10 lb by default
describe("an Equipment Profile's cable and machine step", () => {
  it("is 10 lb for a user in pounds who hasn't set one", async () => {
    const user = await api.signIn({ equipmentProfile: GYM_WITH_CABLES });

    expect(cableStepOf(await user.get("/user"))).toEqual({ stepKg: toKg(10, "lb") });
  });

  // User story 21
  it("is 5 kg for a user in kg who hasn't set one", async () => {
    const user = await api.signIn({ equipmentProfile: GYM_WITH_CABLES });
    await user.patch("/user", { unit: "kg" });

    expect(cableStepOf(await user.get("/user"))).toEqual({ stepKg: 5 });
  });

  it("keeps the step the user saves, and the next save that changes it", async () => {
    const user = await api.signIn({ equipmentProfile: GYM_WITH_CABLES });
    const [profile] = ((await user.get("/user")).body as User).equipmentProfiles;
    const withStep = (pounds: number) => ({
      ...GYM_WITH_CABLES,
      loads: { ...GYM_WITH_CABLES.loads, cable_machine: { stepKg: toKg(pounds, "lb") } },
    });

    expect(cableStepOf(await user.put(`/user/equipment-profiles/${profile.id}`, withStep(15)))).toEqual({
      stepKg: toKg(15, "lb"),
    });
    await user.put(`/user/equipment-profiles/${profile.id}`, withStep(5));
    expect(cableStepOf(await user.get("/user"))).toEqual({ stepKg: toKg(5, "lb") });
  });

  it("is saved with a new profile", async () => {
    const user = await api.signIn();
    const created = await user.post("/user/equipment-profiles", {
      ...GYM_WITH_CABLES,
      isPrimary: false,
      loads: { cable_machine: { stepKg: 2.5 } },
    });

    expect(created.statusCode).toBe(201);
    expect(cableStepOf(created)).toEqual({ stepKg: 2.5 });
  });

  // User story 20
  it("gives a gym listing no weights of its own Full gym's pound loads", async () => {
    const gym = { ...GYM_WITH_CABLES, tags: EquipmentTag.options, loads: {} };
    const user = await api.signIn({ equipmentProfile: gym });

    const [profile] = ((await user.get("/user")).body as User).equipmentProfiles;
    expect(profile.loads.barbell?.barKg).toBe(toKg(45, "lb"));
    expect(profile.loads.dumbbells).toEqual({
      kind: "adjustable",
      minKg: toKg(5, "lb"),
      maxKg: toKg(100, "lb"),
      stepKg: toKg(5, "lb"),
    });
    expect(profile.loads.cable_machine).toEqual({ stepKg: toKg(10, "lb") });
  });

  it("refuses a step of nothing", async () => {
    const user = await api.signIn();
    const created = await user.post("/user/equipment-profiles", {
      ...GYM_WITH_CABLES,
      loads: { cable_machine: { stepKg: 0 } },
    });

    expect(created.statusCode).toBe(400);
  });
});

// Stories 38 to 51 of #176: dumbbells of bars and plates (#181)
describe("an Equipment Profile's bar-and-plates dumbbells", () => {
  const lb = (pounds: number) => toKg(pounds, "lb");
  // The loads of one dumbbell that 4 lb bars with 3 lb × 4 and 5 lb × 4 make, for an Exercise taking one
  const ONE_DUMBBELL_LB = [4, 7, 10, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 31, 33, 36];
  const TWO_DUMBBELLS_LB = [4, 7, 10, 12, 14, 15, 17, 20];
  const takesTwo = (slug: string) => exerciseBySlug(slug)?.dumbbells === 2;

  const withBars = (bars: number): EquipmentProfileInput => ({
    ...DUMBBELLS_AT_HOME,
    loads: {
      dumbbells: {
        kind: "bar_and_plates",
        barKg: lb(4),
        bars,
        plates: [
          { kg: lb(3), count: 4 },
          { kg: lb(5), count: 4 },
        ],
      },
    },
  });

  const savedOver = async (profile: EquipmentProfileInput) => {
    const user = await assessedUser(api);
    const before = await currentPlan(user);
    const [stored] = ((await user.get("/user")).body as User).equipmentProfiles;
    const saved = await user.put(`/user/equipment-profiles/${stored!.id}`, profile);
    expect(saved.statusCode).toBe(200);
    return { user, before, plan: await currentPlan(user) };
  };

  it("are saved as their exact kg", async () => {
    const { user } = await savedOver(withBars(2));

    const [stored] = ((await user.get("/user")).body as User).equipmentProfiles;
    expect(stored!.loads).toEqual(withBars(2).loads);
  });

  it("rebuild the plan, at loads they make", async () => {
    const { before, plan } = await savedOver(withBars(2));

    expect(plan.id).not.toBe(before.id);
    const weighted = plan.plannedExercises.flatMap(({ slug, target }) =>
      target.unit === "kg" ? [{ slug, pounds: loadInUnit(target.kg, "lb") }] : [],
    );
    // Both kinds are planned, so both lists of loads are checked
    expect(new Set(weighted.map(({ slug }) => takesTwo(slug)))).toEqual(new Set([true, false]));
    for (const { slug, pounds } of weighted)
      expect(takesTwo(slug) ? TWO_DUMBBELLS_LB : ONE_DUMBBELL_LB, slug).toContain(pounds);
  });

  it("plan no two-dumbbell Exercise with one bar", async () => {
    const { plan } = await savedOver(withBars(1));

    const slugs = plan.plannedExercises.map(({ slug }) => slug);
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs.filter(takesTwo)).toEqual([]);
  });

  it("can't have no bar", async () => {
    const user = await api.signIn();
    expect((await user.post("/user/equipment-profiles", withBars(0))).statusCode).toBe(400);
  });
});
