import { FoodSearchResults, type Food } from "@fit/shared";
import { useEffect, useState } from "react";
import { ApiError, noAnswerMessage, useApi } from "@/api";
import { errorMessage } from "@/utils/error-message";

const TYPING_PAUSE_MS = 400;

export type FoodSearch = {
  // Undefined before the first search, and while the words are too short to search
  foods?: Food[];
  isSearching: boolean;
  error: string | null;
};

// Foods matching the words, from GET /foods/search, once typing pauses; only the latest words' answer is kept. A new
// `version` searches again, as after a Saved Food changes. `own` is what of the user's own the screen lists
export function useFoodSearch(
  query: string,
  { version = 0, own = "Saved Foods and Saved Meals" }: { version?: number; own?: string } = {},
): FoodSearch {
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
        // USDA didn't answer: the user's own foods are still listed, under the message
        const error = outsideUnavailable
          ? `Food search isn't answering, so only your ${own} are listed. Try again in a minute.`
          : null;
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
  }, [api, words, version, own]);

  return search;
}
