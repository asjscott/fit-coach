import { FoodSearchResults, type Food } from "@fit/shared";
import { useEffect, useState } from "react";
import { ApiError, noAnswerMessage, useApi } from "@/api";
import { errorMessage } from "@/utils/error-message";

const TYPING_PAUSE_MS = 400;
const SEARCH_DOWN =
  "Food search isn't answering, so only your Saved Foods and Saved Meals are listed. Try again in a minute.";

export type FoodSearch = {
  // Undefined before the first search, and while the words are too short to search
  foods?: Food[];
  isSearching: boolean;
  error: string | null;
};

// Foods matching the words, from GET /foods/search, which asks the food sources for the phone. Searches once typing
// pauses, and keeps only the answer to the latest words. A new `version` searches again, as after a Saved Food changes
export function useFoodSearch(query: string, version = 0): FoodSearch {
  const api = useApi();
  const [search, setSearch] = useState<FoodSearch>({ isSearching: false, error: null });
  const words = query.trim();

  useEffect(() => {
    if (words.length < 2) {
      setSearch({ isSearching: false, error: null });
      return;
    }
    const controller = new AbortController();
    setSearch((last) => ({ ...last, isSearching: true }));
    const timer = setTimeout(async () => {
      try {
        const { foods, outsideUnavailable } = FoodSearchResults.parse(
          await api(`/foods/search?${new URLSearchParams({ q: words })}`, { signal: controller.signal }),
        );
        // USDA didn't answer: the user's Saved Foods are still listed, under the message
        const error = outsideUnavailable ? SEARCH_DOWN : null;
        if (!controller.signal.aborted) setSearch({ foods, isSearching: false, error });
      } catch (err) {
        if (controller.signal.aborted) return;
        setSearch({
          isSearching: false,
          // The API couldn't be reached at all
          error: !(err instanceof ApiError)
            ? noAnswerMessage(err, "Searching for food needs a connection.")
            : errorMessage(err),
        });
      }
    }, TYPING_PAUSE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [api, words, version]);

  return search;
}
