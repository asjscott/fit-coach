import type { Food, Serving } from "@fit/shared";
import { z } from "zod";

// Open Food Facts (https://openfoodfacts.github.io/openfoodfacts-server/api/): open data with no key, and the best
// coverage of Canadian packaged food. It asks automated clients to name themselves in the User-Agent
const PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";
const FIELDS =
  "code,product_name,product_name_en,brands,serving_size,serving_quantity,serving_quantity_unit,nutriments";
const USER_AGENT = "fit-coach/1.0";
const TIMEOUT_MS = 8000;
const KJ_PER_KCAL = 4.184;

const amount = z.coerce.number().nonnegative().optional().catch(undefined);
const text = z.string().trim().optional().catch(undefined);

const ProductResponse = z.object({
  status: z.number(),
  product: z
    .object({
      code: z.string().min(1),
      product_name: text,
      product_name_en: text,
      brands: text,
      serving_size: text,
      serving_quantity: amount,
      serving_quantity_unit: text,
      nutriments: z
        .object({
          "energy-kcal_100g": amount,
          "energy-kj_100g": amount,
          proteins_100g: amount,
          carbohydrates_100g: amount,
          fat_100g: amount,
          fiber_100g: amount,
        })
        .optional(),
    })
    .optional(),
});
type Product = NonNullable<z.infer<typeof ProductResponse>["product"]>;

// A /product/{barcode} response as a food. Null when Open Food Facts doesn't know the barcode, or knows the product
// with no name or no energy to count, so the lookup goes on to the next source
export function offProductFood(response: unknown): Food | null {
  const { status, product } = ProductResponse.parse(response);
  if (status !== 1 || !product?.nutriments) return null;
  const n = product.nutriments;
  const kj = n["energy-kj_100g"];
  const kcal = n["energy-kcal_100g"] ?? (kj === undefined ? undefined : Math.round((kj / KJ_PER_KCAL) * 10) / 10);
  const name = product.product_name || product.product_name_en;
  if (kcal === undefined || !name) return null;
  // "Kraft, Kraft Heinz" lists the brand and its owner: the first is the one on the label
  const brand = product.brands?.split(",")[0]?.trim();
  return {
    source: "off",
    id: product.code,
    name,
    ...(brand ? { brand } : {}),
    barcode: product.code,
    per100g: {
      kcal,
      proteinG: n.proteins_100g ?? 0,
      carbsG: n.carbohydrates_100g ?? 0,
      fatG: n.fat_100g ?? 0,
      fibreG: n.fiber_100g ?? 0,
    },
    servings: labelServing(product),
  };
}

// The label's serving, when it's given in grams: "1 tbsp (15 g)" is "1 tbsp" at 15 g, and a bare "70 g" is one serving
function labelServing({ serving_size, serving_quantity, serving_quantity_unit }: Product): Serving[] {
  if (!serving_quantity || (serving_quantity_unit && serving_quantity_unit !== "g")) return [];
  const label = serving_size?.replace(/\(.*\)/, "").trim();
  const named = label && !/^[\d.,\s]+\s*g$/i.test(label);
  return [{ label: named ? label : "1 serving", grams: Math.round(serving_quantity * 10) / 10 }];
}

// The product with this barcode, or null when Open Food Facts has none it can count. Throws when it can't be reached
export async function offByBarcode(code: string): Promise<Food | null> {
  const url = `${PRODUCT_URL}/${encodeURIComponent(code)}.json?${new URLSearchParams({ fields: FIELDS })}`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  // An unknown barcode answers 404 with a status 0 body
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Open Food Facts answered ${response.status}`);
  return offProductFood(await response.json());
}
