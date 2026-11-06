import { useHistory } from "../history-provider";
import { useReloadOnVisit } from "./use-reload-on-visit";

// Keeps a screen that shows History current: a Workout just finished shows, and a Pending Workout that uploads shows
// from the server
export function useRefreshHistory() {
  useReloadOnVisit(useHistory().refresh);
}
