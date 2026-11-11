import { toKg, type EquipmentProfileInput, type User } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { useRouteTestApi } from "../test/route-test-api";

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

  it("refuses a step of nothing", async () => {
    const user = await api.signIn();
    const created = await user.post("/user/equipment-profiles", {
      ...GYM_WITH_CABLES,
      loads: { cable_machine: { stepKg: 0 } },
    });

    expect(created.statusCode).toBe(400);
  });
});
