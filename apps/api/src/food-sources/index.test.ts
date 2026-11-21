import { afterEach, describe, expect, it, vi } from "vitest";
import peanutButter from "./fixtures/off-product-kraft-peanut-butter.json";
import offNotFound from "./fixtures/off-product-not-found.json";
import snickersEggByUpc from "./fixtures/usda-upc-snickers-egg.json";
import { realFoodSources } from "./index";

const PEANUT_BUTTER = "0068100084245";
const SNICKERS_EGG = "040000449270";

// The network, stubbed with saved real answers: Open Food Facts knows the peanut butter, USDA the Snickers egg, and
// either can be made to fail as an outage would
function stubSources({ offDown = false, usdaDown = false } = {}) {
  const asked: string[] = [];
  vi.stubGlobal("fetch", async (input: string | URL) => {
    const url = new URL(String(input));
    if (url.hostname === "world.openfoodfacts.org") {
      asked.push("off");
      if (offDown) return new Response("", { status: 503 });
      return url.pathname.includes(PEANUT_BUTTER)
        ? Response.json(peanutButter)
        : Response.json(offNotFound, { status: 404 });
    }
    asked.push("usda");
    if (usdaDown) return new Response("", { status: 503 });
    const query = url.searchParams.get("query") ?? "";
    return Response.json(query.includes(SNICKERS_EGG) ? snickersEggByUpc : { foods: [] });
  });
  return asked;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// Spec #158, "Food sources": byBarcode asks Open Food Facts first, then USDA's branded foods by GTIN/UPC
describe("realFoodSources().byBarcode", () => {
  const sources = realFoodSources({ usdaApiKey: "test-key" });

  it("takes Open Food Facts' food when it has the barcode, without asking USDA", async () => {
    const asked = stubSources();
    expect(await sources.byBarcode(PEANUT_BUTTER)).toMatchObject({ source: "off", name: "Smooth Peanut Butter" });
    expect(asked).toEqual(["off"]);
  });

  it("asks USDA when Open Food Facts doesn't have it", async () => {
    const asked = stubSources();
    expect(await sources.byBarcode(SNICKERS_EGG)).toMatchObject({ source: "usda", id: "2575290" });
    expect(asked).toEqual(["off", "usda"]);
  });

  it("finds nothing when neither has it", async () => {
    stubSources();
    expect(await sources.byBarcode("0000000000017")).toBeNull();
  });

  it("goes on to USDA when Open Food Facts is down", async () => {
    stubSources({ offDown: true });
    expect(await sources.byBarcode(SNICKERS_EGG)).toMatchObject({ source: "usda" });
  });

  it("fails rather than answer not found when a source that might have it is down", async () => {
    stubSources({ usdaDown: true });
    await expect(sources.byBarcode("0000000000017")).rejects.toThrow();
  });

  it("asks only Open Food Facts without a USDA key, as in dev:local", async () => {
    const asked = stubSources();
    expect(await realFoodSources({}).byBarcode(SNICKERS_EGG)).toBeNull();
    expect(asked).toEqual(["off"]);
  });
});
