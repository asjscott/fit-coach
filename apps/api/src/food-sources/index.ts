import type { Food } from "@fit/shared";
import { offByBarcode } from "./open-food-facts";
import { usdaByBarcode, usdaSearch } from "./usda";

// Where the API finds foods outside its own database (spec #158, "Food sources"). buildApp takes the real ones by
// default and route tests pass fakes, so tests never reach the network. Tell the coach (#168) joins this as a further
// method. The user's own Saved Foods aren't a source: the routes look in them first
export type FoodSources = {
  // Foods matching the words: generic ones (USDA Foundation and SR Legacy) and branded ones, kept apart so search can
  // list the generic first. Throws when the source can't be reached
  search(query: string): Promise<{ generic: Food[]; branded: Food[] }>;
  // The packaged food with this barcode: Open Food Facts first, then USDA's branded foods by GTIN/UPC. Null when none
  // has it; throws when none has it and one of them couldn't be asked
  byBarcode(code: string): Promise<Food | null>;
};

// The real sources. Without a USDA key, as in dev:local and web:signed-in, search finds nothing rather than failing,
// and barcodes are looked up on Open Food Facts alone, which needs no key
export function realFoodSources({ usdaApiKey }: { usdaApiKey?: string }): FoodSources {
  return {
    search: (query) => (usdaApiKey ? usdaSearch(usdaApiKey, query) : Promise.resolve({ generic: [], branded: [] })),
    byBarcode: (code) =>
      firstFound([() => offByBarcode(code), ...(usdaApiKey ? [() => usdaByBarcode(usdaApiKey, code)] : [])]),
  };
}

// The first lookup's food, asking each in turn. One that fails is passed over, but if nothing is found after one
// failed, its error is thrown: "not found" would be a guess
async function firstFound(lookups: (() => Promise<Food | null>)[]): Promise<Food | null> {
  let failure: unknown;
  for (const lookup of lookups) {
    try {
      const food = await lookup();
      if (food) return food;
    } catch (err) {
      failure ??= err;
    }
  }
  if (failure) throw failure;
  return null;
}
