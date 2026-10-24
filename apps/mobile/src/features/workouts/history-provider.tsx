import { createContext, use, type ReactNode } from "react";
import { useHistoryState } from "./hooks/use-history";

type HistoryContextValue = ReturnType<typeof useHistoryState>;

const HistoryContext = createContext<HistoryContextValue | null>(null);

// One History list shared by the History and Workout detail screens, so a Workout
// deleted from its detail is gone when the user returns to History
export function HistoryProvider({ children }: { children: ReactNode }) {
  return <HistoryContext value={useHistoryState()}>{children}</HistoryContext>;
}

export function useHistory() {
  const context = use(HistoryContext);
  if (!context) throw new Error("useHistory must be used inside <HistoryProvider>");
  return context;
}
