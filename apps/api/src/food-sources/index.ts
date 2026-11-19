import type { Food, FoodProposal } from "@fit/shared";
import { geminiParse } from "./gemini";
import { offByBarcode } from "./open-food-facts";
import { usdaByBarcode, usdaSearch } from "./usda";

// Where the API finds foods outside its own database (spec #158, "Food sources"). buildApp takes the real ones by
// default and route tests pass fakes, so tests never reach the network. The user's own Saved Foods aren't a source:
// the routes look in them first
export type FoodSources = {
  // Foods matching the words: generic ones (USDA Foundation and SR Legacy) and branded ones, kept apart so search can
  // list the generic first. Throws when the source can't be reached
  search(query: string): Promise<{ generic: Food[]; branded: Food[] }>;
  // The packaged food with this barcode: Open Food Facts first, then USDA's branded foods by GTIN/UPC. Null when none
  // has it; throws when none has it and one of them couldn't be asked
  byBarcode(code: string): Promise<Food | null>;
  // Tell the coach: the foods in the words, each dated `today` or the day before, with a meal and a portion. Saves
  // nothing. Absent when there's no parser (no Gemini key), which hides the box. Throws when it can't be reached
  parse?(text: string, today: string): Promise<FoodProposal[]>;
};

// The real sources. Without a USDA key, as in dev:local and web:signed-in, search finds nothing rather than failing,
// and barcodes are looked up on Open Food Facts alone, which needs no key. Without a Gemini key there's no parser, so
// Tell the coach is hidden
export function realFoodSources({
  usdaApiKey,
  geminiApiKey,
  geminiModel,
}: {
  usdaApiKey?: string;
  geminiApiKey?: string;
  geminiModel?: string;
}): FoodSources {
  return {
    search: (query) => (usdaApiKey ? usdaSearch(usdaApiKey, query) : Promise.resolve({ generic: [], branded: [] })),
    byBarcode: (code) =>
      firstFound([() => offByBarcode(code), ...(usdaApiKey ? [() => usdaByBarcode(usdaApiKey, code)] : [])]),
    ...(geminiApiKey ? { parse: (text, today) => geminiParse(geminiApiKey, text, today, geminiModel) } : {}),
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
