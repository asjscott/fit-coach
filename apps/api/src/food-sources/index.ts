import type { Food, FoodProposal } from "@fit/shared";
import { geminiParse } from "./gemini";
import { usdaSearch } from "./usda";

// Where the API finds foods outside its own database (spec #158, "Food sources"). buildApp takes the real ones by
// default and route tests pass fakes, so tests never reach the network. Barcodes (#164) and Tell the coach (#168)
// join this as further methods
export type FoodSources = {
  // Foods matching the words: generic ones (USDA Foundation and SR Legacy) and branded ones, kept apart so search can
  // list the generic first. Throws when the source can't be reached
  search(query: string): Promise<{ generic: Food[]; branded: Food[] }>;
  // Tell the coach: the foods in the words, each dated `today` or the day before, with a meal and a portion. Saves
  // nothing. Absent when there's no parser (no Gemini key), which hides the box. Throws when it can't be reached
  parse?(text: string, today: string): Promise<FoodProposal[]>;
};

// The real sources. Without a USDA key, as in dev:local and web:signed-in, search finds nothing rather than failing.
// Without a Gemini key there's no parser, so Tell the coach is hidden
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
    ...(geminiApiKey ? { parse: (text, today) => geminiParse(geminiApiKey, text, today, geminiModel) } : {}),
  };
}
