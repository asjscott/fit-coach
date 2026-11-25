import type { HoldState, TargetRange } from "@fit/engines";
import { elapsedClockLabel } from "./format";

function phaseName({ phase, atTop }: HoldState, target: TargetRange | null): string {
  if (phase === "lead-in") return "Get into position";
  if (phase === "done") return "Done";
  if (phase === "hold" || !target) return "Hold";
  return atTop ? "Top of the range" : "Target reached";
}

// How a running hold reads: its phase, the clock, and both for screen readers
export function holdWords(state: HoldState, target: TargetRange | null) {
  const phase = phaseName(state, target);
  const countsDown = state.phase === "lead-in" || state.phase === "hold";
  const clock = elapsedClockLabel((countsDown ? state.secondsLeft : state.secondsHeld) * 1000);
  return { phase, clock, label: `${phase}, ${clock} ${countsDown ? "left" : "held"}` };
}
