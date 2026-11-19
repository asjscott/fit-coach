import { FoodProposals, TellTheCoachStatus, type FoodProposal } from "@fit/shared";
import { useCallback, useEffect, useState } from "react";
import { ApiError, useApi } from "@/api";
import { useToast } from "@/contexts/toast-context";

// Tell the coach on Today (#168). `available` is false until the API says it has a parser, so without a Gemini key, or
// offline, the box never shows and nothing else on Today waits on it. `parse` answers the proposals, or null when it
// failed, after a toast saying why
export function useTellTheCoach() {
  const api = useApi();
  const { showToast } = useToast();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let current = true;
    api("/tell-the-coach").then(
      (status) => current && setAvailable(TellTheCoachStatus.parse(status).available),
      () => {},
    );
    return () => {
      current = false;
    };
  }, [api]);

  const parse = useCallback(
    async (text: string, today: string): Promise<FoodProposal[] | null> => {
      try {
        const answer = await api("/tell-the-coach", { method: "POST", body: JSON.stringify({ text, today }) });
        return FoodProposals.parse(answer).proposals;
      } catch (err) {
        if (err instanceof ApiError) showToast("The Coach couldn't read that just now", { error: err });
        else showToast("Telling the Coach needs a connection. Try again when you have one.");
        return null;
      }
    },
    [api, showToast],
  );

  return { available, parse };
}
