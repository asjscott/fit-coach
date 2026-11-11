import { muscleGroupsOf, type Muscle, type MuscleGroup, type PlanReason, type ProgressionChange } from "@fit/shared";
import { exerciseName } from "../workouts/library";
import { weekdayLabel } from "../workouts/format";
import { localDateText } from "../workouts/local-date-time";

const GROUP_NAMES: Record<MuscleGroup, { name: string; plural: boolean }> = {
  legs: { name: "Legs", plural: true },
  back: { name: "Back", plural: false },
  chest: { name: "Chest", plural: false },
  shoulders: { name: "Shoulders", plural: true },
  core: { name: "Core", plural: false },
};

// The order Today puts them in, its card showing the first
const ORDER: PlanReason["code"][] = ["recovering", "budget-met", "behind"];

// "Legs and Back are", or null when none of the Muscles is in a group
function groupsAre(muscles: readonly Muscle[]) {
  const groups = muscleGroupsOf(muscles);
  if (!groups.length) return null;
  const names = groups.map((group) => GROUP_NAMES[group].name);
  const listed = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
  const plural = groups.length > 1 || GROUP_NAMES[groups[0]].plural;
  return `${listed} ${plural ? "are" : "is"}`;
}

// The day of a date in the user's timezone: today, or its weekday, as fatigue lasts less than a week
const dayOf = (date: string, now: Date) =>
  date === localDateText(now) ? "today" : weekdayLabel(new Date(`${date}T12:00:00`));

function line(reason: PlanReason, now: Date) {
  switch (reason.code) {
    case "recovering": {
      const groups = groupsAre(reason.muscles);
      return groups && `${groups} recovering from ${dayOf(reason.lastSetOn, now)}.`;
    }
    case "budget-met":
      return "This week's work is done. This one's extra.";
    case "behind": {
      const groups = groupsAre(reason.muscles);
      return groups && `${groups} furthest behind this week.`;
    }
  }
}

// Why progression changed an Exercise's Working Level since it was last done (#132), shown under the Exercise; null
// when nothing changed. An outgrown level is planned as its harder variant or a hold, so it's never shown as it is
export function progressionChangeLine(change: ProgressionChange | undefined): string | null {
  switch (change?.code) {
    case "target-up":
      return "One more rep: every Set reached the target.";
    case "load-up":
      return "Heavier: every Set reached the top of the range.";
    case "new-base":
      return "From the weight you lifted last time.";
    case "load-down":
      return "Lighter: the last two times fell short of the target.";
    case "target-down":
      return "Fewer: the last two times fell short of the target.";
    case "harder-variant":
      return `Ready for this after ${exerciseName(change.from)}.`;
    case "held-at-top":
      return "Held at 20 reps: no heavier weight or harder variant here.";
    case "outgrown":
    case undefined:
      return null;
  }
}

// Why the Coach planned this Workout, one line per reason in the order recovering, budget met, behind. Nothing for a
// plan stored before reasons
export const planReasonLines = (reasons: readonly PlanReason[] | undefined, now: Date): string[] =>
  [...(reasons ?? [])]
    .sort((a, b) => ORDER.indexOf(a.code) - ORDER.indexOf(b.code))
    .flatMap((reason) => line(reason, now) ?? []);
