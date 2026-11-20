import { type FoodProposal, Meal } from "@fit/shared";
import { z } from "zod";

// Tell the coach on Gemini Flash's free tier, through its REST API (https://ai.google.dev/api/generate-content). The key
// stays on the server: the phone only calls this API. The model returns each food with its own per-100 g nutrients, so
// a proposal is a whole food in the one food shape with no second lookup, and the user checks it on the confirm screen.
// The latest Flash-Lite, as Google retires named models for new keys (gemini-2.5-flash went that way), and on the free
// tier full Flash took minutes to answer where Flash-Lite took under 2 s; GEMINI_MODEL pins another. Its thinking stays
// low (minimal isn't offered): listing foods needs little, and it keeps the answer well inside the timeout
const MODEL = "gemini-flash-lite-latest";
const TIMEOUT_MS = 15000;
const generateUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const INSTRUCTIONS = `You turn what someone says they ate into a list of foods for a food diary.
- Only foods and drinks they say they ate or drank. Leave out anything else; if there's none, return no foods.
- day: "yesterday" only if they say it was yesterday (or last night), otherwise "today".
- meal: the meal they name. If they name none, the likeliest from the food and the words ("for dinner", "this morning").
  Drinks and foods between meals are "snacks".
- name: a short generic name, main word first, as a nutrition database would have it ("Egg, boiled", "Toast, white bread").
- grams: the weight they ate. Use the amount they give; otherwise one typical portion.
- serving: when they count something ("two eggs", "3 slices"), one of it as a label and its grams ("1 large egg", 50),
  and how many. Otherwise leave it out. grams must equal serving grams times count.
- per100g: typical nutrients per 100 g as eaten (cooked if cooked): kcal, and grams of protein, carbs, fat and fibre.`;

// The JSON Gemini is told to answer with (OpenAPI schema subset, as generationConfig.responseSchema takes)
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    foods: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          day: { type: "STRING", enum: ["today", "yesterday"] },
          meal: { type: "STRING", enum: Meal.options },
          grams: { type: "NUMBER" },
          serving: {
            type: "OBJECT",
            nullable: true,
            properties: { label: { type: "STRING" }, grams: { type: "NUMBER" }, count: { type: "NUMBER" } },
            required: ["label", "grams", "count"],
          },
          per100g: {
            type: "OBJECT",
            properties: {
              kcal: { type: "NUMBER" },
              proteinG: { type: "NUMBER" },
              carbsG: { type: "NUMBER" },
              fatG: { type: "NUMBER" },
              fibreG: { type: "NUMBER" },
            },
            required: ["kcal", "proteinG", "carbsG", "fatG"],
          },
        },
        required: ["name", "day", "meal", "grams", "per100g"],
      },
    },
  },
  required: ["foods"],
};

const amount = z.number().nonnegative().nullish();
const ParsedFood = z.object({
  name: z.string().trim().min(1).max(100),
  day: z.enum(["today", "yesterday"]),
  meal: Meal,
  grams: z.number().positive(),
  serving: z
    .object({ label: z.string().trim().min(1).max(60), grams: z.number().positive(), count: z.number().positive() })
    .nullish(),
  per100g: z.object({ kcal: z.number().nonnegative(), proteinG: amount, carbsG: amount, fatG: amount, fibreG: amount }),
});
type ParsedFood = z.infer<typeof ParsedFood>;

const Response = z.object({
  candidates: z
    .array(z.object({ content: z.object({ parts: z.array(z.object({ text: z.string().optional() })) }).optional() }))
    .optional(),
});

// The calendar day before a local date
function dayBefore(date: string): string {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "food";

const tenth = (value: number) => Math.round(value * 10) / 10;

function toProposal(food: ParsedFood, today: string): FoodProposal {
  const { serving, per100g } = food;
  // Within what POST /days/:date/food-entries takes: up to 5 kg, or 100 servings
  const usesServing = serving && serving.count <= 100 && serving.grams * serving.count <= 5000;
  return {
    date: food.day === "yesterday" ? dayBefore(today) : today,
    meal: food.meal,
    food: {
      source: "coach",
      id: slug(food.name),
      name: food.name,
      per100g: {
        kcal: per100g.kcal,
        proteinG: per100g.proteinG ?? 0,
        carbsG: per100g.carbsG ?? 0,
        fatG: per100g.fatG ?? 0,
        fibreG: per100g.fibreG ?? 0,
      },
      servings: usesServing ? [{ label: serving.label, grams: tenth(serving.grams) }] : [],
    },
    portion: usesServing
      ? { serving: serving.label, count: serving.count }
      : { grams: Math.min(5000, Math.max(1, Math.round(food.grams))) },
  };
}

// A generateContent response as proposals, dated from `today`, in the order the foods were said. A food without a
// weight or kcal is left out, missing macros count as 0, and an empty, blocked or unreadable answer has none
export function geminiProposals(response: unknown, today: string): FoodProposal[] {
  const parsed = Response.safeParse(response);
  const text = parsed.success
    ? (parsed.data.candidates?.[0]?.content?.parts.map((p) => p.text ?? "").join("") ?? "")
    : "";
  let foods: unknown;
  try {
    foods = (JSON.parse(text) as { foods?: unknown }).foods;
  } catch {
    return [];
  }
  if (!Array.isArray(foods)) return [];
  return foods.flatMap((raw) => {
    const food = ParsedFood.safeParse(raw);
    return food.success ? [toProposal(food.data, today)] : [];
  });
}

// The foods in the words, dated from `today`. Throws when Gemini can't be reached or refuses
export async function geminiParse(apiKey: string, text: string, today: string, model = MODEL): Promise<FoodProposal[]> {
  const ask = () => generate(apiKey, text, model);
  let response = await ask();
  // The free tier answers 503 "experiencing high demand" in short spikes, so a busy answer is asked once more
  if (response.status === 503) response = await ask();
  if (!response.ok) {
    // Gemini says why in its error body (a retired model, a bad key, a quota), which the API's log then shows
    const reason = await response
      .json()
      .then((body: { error?: { message?: string } }) => body.error?.message)
      .catch(() => undefined);
    throw new Error(`Gemini answered ${response.status}${reason ? `: ${reason}` : ""}`);
  }
  return geminiProposals(await response.json(), today);
}

// One generateContent call for the foods in the words
function generate(apiKey: string, text: string, model: string): Promise<Response> {
  return fetch(generateUrl(model), {
    method: "POST",
    // The key goes in a header, so it never appears in a logged URL
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0,
        thinkingConfig: { thinkingLevel: "low" },
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}
