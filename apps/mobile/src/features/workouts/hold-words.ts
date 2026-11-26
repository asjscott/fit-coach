import type { HoldState, TargetRange } from "@fit/engines";
import { elapsedClockLabel } from "./format";

// What the guided flow says it's doing: the change before a hold, or sides, and which side is held
export function guidedHeading({ phase, side }: Pick<HoldState, "phase" | "side">, sides: 1 | 2, paused: boolean) {
  if (paused) return "Paused";
  if (phase === "lead-in") return side === 2 ? "Switch sides" : "Change position";
  if (phase === "done") return "Done";
  return sides === 2 ? `Hold, side ${side} of 2` : "Hold";
}

// The flow's clock, with the paused hold's phase left to the heading
export function guidedClock({ secondsLeft }: Pick<HoldState, "secondsLeft">, heading: string) {
  const clock = elapsedClockLabel(secondsLeft * 1000);
  return { clock, label: `${heading}, ${clock} left` };
}

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
