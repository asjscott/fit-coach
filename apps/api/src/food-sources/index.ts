import type { Food } from "@fit/shared";
import { usdaSearch } from "./usda";

// Where the API finds foods outside its own database (spec #158, "Food sources"). buildApp takes the real ones by
// default and route tests pass fakes, so tests never reach the network. Barcodes (#164) and Tell the coach (#168)
// join this as further methods
export type FoodSources = {
  // Foods matching the words: generic ones (USDA Foundation and SR Legacy) and branded ones, kept apart so search can
  // list the generic first. Throws when the source can't be reached
  search(query: string): Promise<{ generic: Food[]; branded: Food[] }>;
};

// The real sources. Without a USDA key, as in dev:local and web:signed-in, search finds nothing rather than failing
export function realFoodSources({ usdaApiKey }: { usdaApiKey?: string }): FoodSources {
  return {
    search: (query) => (usdaApiKey ? usdaSearch(usdaApiKey, query) : Promise.resolve({ generic: [], branded: [] })),
  };
}
