import { afterEach, describe, expect, it, vi } from "vitest";
import eggsAndToast from "./fixtures/gemini-parse-eggs-toast.json";
import { geminiParse, geminiProposals } from "./gemini";
import { realFoodSources } from "./index";

// A generateContent answer whose text is the JSON the response schema asks for
const answer = (text: string) => ({ candidates: [{ content: { parts: [{ text }], role: "model" }, index: 0 }] });

describe("geminiProposals", () => {
  // "yesterday I had two eggs and toast", saved in Gemini's generateContent shape (spec #158, "Mapping tests")
  it("maps a parse into dated proposals in the one food shape", () => {
    expect(geminiProposals(eggsAndToast, "2026-11-18")).toEqual([
      {
        date: "2026-11-17",
        meal: "breakfast",
        food: {
          source: "coach",
          id: "egg-boiled",
          name: "Egg, boiled",
          per100g: { kcal: 155, proteinG: 12.6, carbsG: 1.1, fatG: 10.6, fibreG: 0 },
          servings: [{ label: "1 large egg", grams: 50 }],
        },
        portion: { serving: "1 large egg", count: 2 },
      },
      {
        date: "2026-11-17",
        meal: "breakfast",
        // No fibre given counts as 0 g
        food: {
          source: "coach",
          id: "toast-white-bread",
          name: "Toast, white bread",
          per100g: { kcal: 293, proteinG: 9, carbsG: 54.4, fatG: 4, fibreG: 0 },
          servings: [],
        },
        portion: { grams: 60 },
      },
    ]);
  });

  it("dates today's foods today, and yesterday's across a month", () => {
    const food = (day: string) => ({
      name: "Apple",
      day,
      meal: "snacks",
      grams: 180,
      per100g: { kcal: 52, proteinG: 0.3, carbsG: 14, fatG: 0.2, fibreG: 2.4 },
    });
    const proposals = geminiProposals(
      answer(JSON.stringify({ foods: [food("today"), food("yesterday")] })),
      "2026-12-01",
    );
    expect(proposals.map((p) => p.date)).toEqual(["2026-12-01", "2026-11-30"]);
  });

  it("leaves out a food it can't log, and finds none in an empty or blocked answer", () => {
    const apple = { name: "Apple", day: "today", meal: "lunch", grams: 180, per100g: { kcal: 52 } };
    const noGrams = { ...apple, name: "Mystery", grams: 0 };
    const noKcal = { ...apple, name: "Water", per100g: {} };
    expect(
      geminiProposals(answer(JSON.stringify({ foods: [noGrams, apple, noKcal] })), "2026-11-18").map(
        (p) => p.food.name,
      ),
    ).toEqual(["Apple"]);
    expect(geminiProposals(answer('{"foods": []}'), "2026-11-18")).toEqual([]);
    expect(geminiProposals({ promptFeedback: { blockReason: "SAFETY" } }, "2026-11-18")).toEqual([]);
    expect(geminiProposals(answer("not json"), "2026-11-18")).toEqual([]);
  });
});

describe("geminiParse", () => {
  afterEach(() => vi.unstubAllGlobals());

  // A fetch that answers with `body` and `status`, and remembers the request
  const stubFetch = (body: unknown, status = 200) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify(body), { status }));
    vi.stubGlobal("fetch", fetchStub);
    return fetchStub;
  };
  const requestOf = (fetchStub: ReturnType<typeof stubFetch>) => {
    const [url, init] = fetchStub.mock.calls[0] as unknown as [string, RequestInit];
    return { url, body: JSON.parse(init.body as string) };
  };

  // gemini-2.5-flash is closed to new keys (404 "no longer available to new users"), so the default follows the
  // latest Flash, with thinking kept low so an answer comes back well inside the timeout
  it("asks the latest Flash model, thinking low, for the JSON food list", async () => {
    const fetchStub = stubFetch(eggsAndToast);
    expect(await geminiParse("key", "two eggs", "2026-11-18")).toHaveLength(2);
    const { url, body } = requestOf(fetchStub);
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent");
    expect(body.generationConfig).toMatchObject({
      responseMimeType: "application/json",
      temperature: 0,
      thinkingConfig: { thinkingLevel: "low" },
    });
  });

  it("asks GEMINI_MODEL's model when one is set", async () => {
    const fetchStub = stubFetch(eggsAndToast);
    await geminiParse("key", "two eggs", "2026-11-18", "gemini-3.8-flash");
    expect(requestOf(fetchStub).url).toContain("/models/gemini-3.8-flash:generateContent");
  });

  // So the API's log says why, not just the status
  it("throws with Gemini's own message when it refuses", async () => {
    stubFetch({ error: { code: 404, message: "This model is no longer available to new users." } }, 404);
    await expect(geminiParse("key", "two eggs", "2026-11-18")).rejects.toThrow(
      "Gemini answered 404: This model is no longer available to new users.",
    );
  });
});

describe("realFoodSources", () => {
  // Without a Gemini key there's no parser, so the box is hidden
  it("has a parser only with a Gemini key", () => {
    expect(realFoodSources({}).parse).toBeUndefined();
    expect(realFoodSources({ geminiApiKey: "key" }).parse).toBeTypeOf("function");
  });
});
