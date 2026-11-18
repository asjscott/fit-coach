import type { Food } from "@fit/shared";
import { describe, expect, it } from "vitest";
import type { FoodSources } from "../food-sources";
import { useRouteTestApi } from "../test/route-test-api";

const usdaFood = (id: string, name: string, brand?: string): Food => ({
  source: "usda",
  id,
  name,
  ...(brand ? { brand } : {}),
  per100g: { kcal: 150, proteinG: 12, carbsG: 1, fatG: 10, fibreG: 0 },
  servings: [],
});

const eggWhole = usdaFood("748967", "Eggs, Grade A, Large, egg whole");
const eggWhite = usdaFood("747997", "Eggs, Grade A, Large, egg white");
const brandedEgg = usdaFood("2677671", "Egg", "Just");

// Never reaches USDA: "egg" finds two generic foods and a branded one, and "outage" fails as USDA being down would
const foodSources: FoodSources = {
  async search(query) {
    if (query === "outage") throw new Error("USDA food search answered 503");
    return query === "egg" ? { branded: [brandedEgg], generic: [eggWhole, eggWhite] } : { generic: [], branded: [] };
  },
};

const api = useRouteTestApi({ foodSources });

describe("GET /foods/search", () => {
  it("lists generic foods before branded ones (spec #158 story 64)", async () => {
    const user = await api.signIn();
    const { statusCode, body } = await user.get("/foods/search?q=egg");
    expect(statusCode).toBe(200);
    expect(body).toEqual({ foods: [eggWhole, eggWhite, brandedEgg] });
  });

  it("finds nothing for words no source knows", async () => {
    const user = await api.signIn();
    expect((await user.get("/foods/search?q=zzzz")).body).toEqual({ foods: [] });
  });

  it("refuses an empty search", async () => {
    const user = await api.signIn();
    expect((await user.get("/foods/search?q=%20")).statusCode).toBe(400);
  });

  it("answers 502 when the food source can't be reached, so the phone can say so", async () => {
    const user = await api.signIn();
    const { statusCode, body } = await user.get("/foods/search?q=outage");
    expect(statusCode).toBe(502);
    expect(body).toEqual({ error: "food search is unavailable" });
  });
});
