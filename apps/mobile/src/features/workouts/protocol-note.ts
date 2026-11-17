import { TEST_REPS, type ProtocolState } from "@fit/engines";
import type { LoadType, WeightUnit } from "@fit/shared";
import { describeSet, loadLabel } from "./format";

export type ProtocolNote = { text: string; finished: boolean };

// What an Assessment Workout's test asks for next, and whether it's finished: Sets of 5 working up to RPE 9, the
// heaviest load for as many reps as possible (past 12 ends it as load-limited), or a bodyweight or timed test's one Set
// to the maximum. A finished test points on to the next test, or says it was the last one when there's none left.
// Loads are in the user's unit
export function protocolNote(
  protocol: ProtocolState,
  setCount: number,
  loadType: LoadType,
  { nextTest, unit }: { nextTest: boolean; unit: WeightUnit },
): ProtocolNote {
  const workingUp = (text: string) => ({ text, finished: false });
  const finished = (text: string) => ({
    text: `${text} ${nextTest ? "On to the next test." : "That was the last test: finish the Workout when you're ready."}`,
    finished: true,
  });
  switch (protocol.status) {
    case "done":
      return finished("Done: that Set was your top Set.");
    case "load-limited":
      return finished(
        "Done: past 12 reps at your heaviest load. Your result is a lower bound, limited by your equipment.",
      );
    case "one-set":
      return workingUp(
        loadType === "timed"
          ? "One Set: hold as long as you can with good form, then log the seconds."
          : "One Set: as many reps as you can with good form.",
      );
    case "at-heaviest":
      return workingUp(
        `${loadLabel(protocol.suggestedKg, unit)} is your heaviest: as many reps as you can to RPE 9. Past 12 reps ends the test.`,
      );
    case "working-up": {
      const kg = protocol.suggestedKg;
      if (setCount === 0) {
        const start = kg === null ? "Start light." : `Start at ${loadLabel(kg, unit)}.`;
        return workingUp(`Sets of ${TEST_REPS}, adding weight each Set until one is RPE 9. ${start}`);
      }
      return workingUp(
        kg === null
          ? `Add weight for the next Set of ${TEST_REPS}`
          : `Next: ${describeSet({ kind: "external", kg, reps: TEST_REPS }, unit)}, then rate it`,
      );
    }
  }
}
