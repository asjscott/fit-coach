import type { Food, Serving } from "@fit/shared";
import { z } from "zod";
import { barcodeKey, upcOf } from "./barcode";

// USDA FoodData Central (https://fdc.nal.usda.gov/api-guide). Its key stays on the server: the phone only calls this API
const SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const FOODS_URL = "https://api.nal.usda.gov/fdc/v1/foods";
const GENERIC_TYPES = "Foundation,SR Legacy";
const TIMEOUT_MS = 8000;

// Nutrient ids. Newer Foundation foods give only Atwater energy, and some give carbs by summation only
const ENERGY_IDS = [1008, 2047, 2048];
const PROTEIN_IDS = [1003];
const CARBS_IDS = [1005, 1050];
const FAT_IDS = [1004];
const FIBRE_IDS = [1079];

const SearchFood = z.object({
  fdcId: z.number(),
  description: z.string().min(1),
  brandName: z.string().nullish(),
  brandOwner: z.string().nullish(),
  gtinUpc: z.string().nullish(),
  servingSize: z.number().nullish(),
  servingSizeUnit: z.string().nullish(),
  householdServingFullText: z.string().nullish(),
  foodNutrients: z.array(z.object({ nutrientId: z.number(), value: z.number().nullish() })),
});
type SearchFood = z.infer<typeof SearchFood>;

const SearchResponse = z.object({ foods: z.array(z.unknown()) });

// A /foods/search response as foods, in USDA's order. Nutrients in search results are per 100 g. A food USDA gives
// no energy for is left out, since it can't be counted
export function usdaSearchFoods(response: unknown): Food[] {
  return SearchResponse.parse(response).foods.flatMap((raw) => {
    const parsed = SearchFood.safeParse(raw);
    const food = parsed.success ? toFood(parsed.data) : null;
    return food ? [food] : [];
  });
}

function toFood(food: SearchFood): Food | null {
  const amount = (ids: number[]) => {
    for (const id of ids) {
      const value = food.foodNutrients.find((n) => n.nutrientId === id)?.value;
      if (value != null) return Math.max(0, value);
    }
    return undefined;
  };
  const kcal = amount(ENERGY_IDS);
  if (kcal === undefined) return null;
  const brand = food.brandName ?? food.brandOwner;
  return {
    source: "usda",
    id: String(food.fdcId),
    name: sentenceCase(food.description),
    ...(brand ? { brand: titleCase(brand) } : {}),
    ...(food.gtinUpc ? { barcode: food.gtinUpc } : {}),
    per100g: {
      kcal,
      proteinG: amount(PROTEIN_IDS) ?? 0,
      carbsG: amount(CARBS_IDS) ?? 0,
      fatG: amount(FAT_IDS) ?? 0,
      fibreG: amount(FIBRE_IDS) ?? 0,
    },
    servings: labelServing(food),
  };
}

// A branded food's label serving, when it's given in grams: one in millilitres has no weight to go on
function labelServing({ servingSize, servingSizeUnit, householdServingFullText }: SearchFood): Serving[] {
  if (!servingSize || servingSize <= 0 || !/^(g|grm)$/i.test(servingSizeUnit ?? "")) return [];
  const label = householdServingFullText?.trim();
  // Grams to a tenth, since USDA sends float noise such as 31.200000762939453
  return [{ label: label ? lowerCase(label) : "1 serving", grams: Math.round(servingSize * 10) / 10 }];
}

const FoodDetails = z.object({
  fdcId: z.number(),
  foodPortions: z
    .array(
      z.object({
        amount: z.number().nullish(),
        modifier: z.string().nullish(),
        portionDescription: z.string().nullish(),
        gramWeight: z.number().nullish(),
        measureUnit: z.object({ name: z.string() }).nullish(),
        sequenceNumber: z.number().nullish(),
      }),
    )
    .nullish(),
});
type FoodDetails = z.infer<typeof FoodDetails>;

// Units that name no household measure: the portion's own words say what it is, or it's the label's reference amount
const UNNAMED_UNITS = new Set(["undetermined", "RACC"]);

// Generic foods with the household portions from a /foods?fdcIds=…&format=full response as their servings, in USDA's
// order ("1 large", "1 cup chopped"). A food missing from the response keeps its servings
export function withUsdaServings(foods: Food[], response: unknown): Food[] {
  const servingsById = new Map<string, Serving[]>();
  for (const raw of Array.isArray(response) ? response : []) {
    const parsed = FoodDetails.safeParse(raw);
    if (parsed.success) servingsById.set(String(parsed.data.fdcId), portionServings(parsed.data));
  }
  return foods.map((food) => {
    const servings = servingsById.get(food.id);
    return servings?.length ? { ...food, servings } : food;
  });
}

function portionServings({ foodPortions }: FoodDetails): Serving[] {
  const servings: Serving[] = [];
  const ordered = [...(foodPortions ?? [])].sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0));
  for (const portion of ordered) {
    const unit = portion.measureUnit?.name;
    if (unit === "RACC" || !portion.gramWeight || portion.gramWeight <= 0) continue;
    const words = portion.modifier?.trim() || portion.portionDescription?.trim();
    const named = unit && !UNNAMED_UNITS.has(unit) ? unit : undefined;
    if (!words && !named) continue;
    const label = [portion.amount ?? 1, named, words].filter(Boolean).join(" ");
    if (servings.some((s) => s.label === label)) continue;
    servings.push({ label, grams: Math.round(portion.gramWeight * 100) / 100 });
  }
  return servings;
}

// Branded names and servings come in capitals: "EGG BAGELS, EGG" reads as "Egg bagels, egg", "1 EGG" as "1 egg"
const isShouting = (text: string) => text === text.toUpperCase() && /[A-Z]/.test(text);
const lowerCase = (text: string) => (isShouting(text) ? text.toLowerCase() : text);
const sentenceCase = (text: string) => (isShouting(text) ? text.charAt(0) + text.slice(1).toLowerCase() : text);
const titleCase = (text: string) =>
  isShouting(text) ? text.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m) => m.toUpperCase()) : text;

// Generic foods (Foundation and SR Legacy) and branded ones for the words, searched side by side. Throws when USDA
// can't be reached or refuses
export async function usdaSearch(apiKey: string, query: string): Promise<{ generic: Food[]; branded: Food[] }> {
  const searchOf = async (dataType: string, pageSize: number) =>
    usdaSearchFoods(await searchUsda(apiKey, { query, dataType, pageSize: String(pageSize) }));
  const [generic, branded] = await Promise.all([
    searchOf(GENERIC_TYPES, 10).then((foods) => withPortions(apiKey, foods)),
    searchOf("Branded", 15),
  ]);
  return { generic, branded };
}

// Search results carry no portions for generic foods, so their details are fetched in one call. Should that fail, the
// foods are still found, counted in grams
async function withPortions(apiKey: string, foods: Food[]): Promise<Food[]> {
  if (foods.length === 0) return foods;
  try {
    const params = new URLSearchParams({ fdcIds: foods.map((food) => food.id).join(","), format: "full" });
    return withUsdaServings(foods, await getUsda(`${FOODS_URL}?${params}`, apiKey));
  } catch {
    return foods;
  }
}

// A branded /foods/search response for a barcode as the food with that barcode, or null when none has it: USDA's
// search also answers near matches
export function usdaBarcodeFood(response: unknown, code: string): Food | null {
  return (
    usdaSearchFoods(response).find((food) => food.barcode && barcodeKey(food.barcode) === barcodeKey(code)) ?? null
  );
}

// The branded food with this GTIN/UPC, or null when USDA has none. Throws when USDA can't be reached or refuses
export async function usdaByBarcode(apiKey: string, code: string): Promise<Food | null> {
  const response = await searchUsda(apiKey, { query: `gtinUpc:${upcOf(code)}`, dataType: "Branded", pageSize: "5" });
  return usdaBarcodeFood(response, code);
}

function searchUsda(apiKey: string, params: Record<string, string>): Promise<unknown> {
  return getUsda(`${SEARCH_URL}?${new URLSearchParams(params)}`, apiKey);
}

async function getUsda(url: string, apiKey: string): Promise<unknown> {
  // The key goes in a header, so it never appears in a logged URL
  const response = await fetch(url, { headers: { "X-Api-Key": apiKey }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`USDA answered ${response.status}`);
  return response.json();
}
