import { toKg, type User, type Workout } from "@fit/shared";
import { describe, expect, it } from "vitest";
import { useRouteTestApi } from "../test/route-test-api";
import { lifted, workout } from "../test/workouts";

const api = useRouteTestApi();

// User story 18: the user chooses pounds or kilograms in Profile, lb by default; the server stores kg only
describe("the user's unit", () => {
  it("is lb for a new user who has never chosen", async () => {
    const user = await api.signIn();

    expect(((await user.get("/user")).body as User).unit).toBe("lb");
  });

  it("is kept once the user chooses kg, and can go back to lb", async () => {
    const user = await api.signIn();

    expect(((await user.patch("/user", { unit: "kg" })).body as User).unit).toBe("kg");
    expect(((await user.get("/user")).body as User).unit).toBe("kg");
    expect(((await user.patch("/user", { unit: "lb" })).body as User).unit).toBe("lb");
  });

  it("refuses a unit other than lb or kg", async () => {
    const user = await api.signIn();

    expect((await user.patch("/user", { unit: "stone" })).statusCode).toBe(400);
  });

  // User story 19: a load entered in pounds is stored as its exact kg, so it always shows back as entered
  it("stores a load entered in pounds as its exact kg", async () => {
    const user = await api.signIn();
    const pounds = workout(1, [
      { slug: "goblet-squat", sets: [lifted(toKg(25, "lb"), 10), lifted(toKg(25, "lb"), 9)] },
    ]);

    expect((await user.post("/workouts", pounds)).statusCode).toBe(201);

    const [stored] = (await user.get("/workouts")).body as Workout[];
    expect(stored.workoutExercises[0].sets.map((set) => set.kind === "external" && set.kg)).toEqual([
      toKg(25, "lb"),
      toKg(25, "lb"),
    ]);
  });
});
