import type { Food, Serving } from "@fit/shared";
import { z } from "zod";

// USDA FoodData Central (https://fdc.nal.usda.gov/api-guide). Its key stays on the server: the phone only calls this API
const SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
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

// Branded names and servings come in capitals: "EGG BAGELS, EGG" reads as "Egg bagels, egg", "1 EGG" as "1 egg"
const isShouting = (text: string) => text === text.toUpperCase() && /[A-Z]/.test(text);
const lowerCase = (text: string) => (isShouting(text) ? text.toLowerCase() : text);
const sentenceCase = (text: string) => (isShouting(text) ? text.charAt(0) + text.slice(1).toLowerCase() : text);
const titleCase = (text: string) =>
  isShouting(text) ? text.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m) => m.toUpperCase()) : text;

// Generic foods (Foundation and SR Legacy) and branded ones for the words, searched side by side. Throws when USDA
// can't be reached or refuses
export async function usdaSearch(apiKey: string, query: string): Promise<{ generic: Food[]; branded: Food[] }> {
  const searchOf = async (dataType: string, pageSize: number) => {
    const url = `${SEARCH_URL}?${new URLSearchParams({ query, dataType, pageSize: String(pageSize) })}`;
    // The key goes in a header, so it never appears in a logged URL
    const response = await fetch(url, { headers: { "X-Api-Key": apiKey }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`USDA food search answered ${response.status}`);
    return usdaSearchFoods(await response.json());
  };
  const [generic, branded] = await Promise.all([searchOf(GENERIC_TYPES, 10), searchOf("Branded", 15)]);
  return { generic, branded };
}
