import { useCallback } from "react";
import { ApiError, noAnswerMessage } from "@/api";
import { useToast } from "@/contexts/toast-context";

// Sends a write and answers what it answers, or null when it didn't work, after a toast says why: `failure` and the
// API's error, the words `refusal` has for that error, or `needsConnection` when there was no answer
export function useWrite(needsConnection: string, refusal?: (err: ApiError) => string | undefined) {
  const { showToast } = useToast();
  return useCallback(
    async <T>(failure: string, request: () => Promise<T>): Promise<T | null> => {
      try {
        return await request();
      } catch (err) {
        const refused = err instanceof ApiError && refusal?.(err);
        if (!(err instanceof ApiError)) showToast(noAnswerMessage(err, needsConnection));
        else if (refused) showToast(refused);
        else showToast(failure, { error: err });
        return null;
      }
    },
    [needsConnection, refusal, showToast],
  );
}
