import { type NutritionRange, nutritionRanges, rangeState } from "@fit/engines";
import type { Day, FoodIdea, Meal } from "@fit/shared";
import { wholeNumber } from "./format";

export type CoachSummary = {
  // What's left of the day's kcal and protein to be in range, or that they're in range or over
  headline: string;
  // How the Food Ideas would fill what's left; null once protein is in range or the kcal are over
  line: string | null;
};

// A Food Idea's set portion and what it holds: "½ block · 216 kcal · 26 g protein"
export const ideaLine = ({ portion, nutrients }: FoodIdea) =>
  `${portion.label} · ${wholeNumber(nutrients.kcal)} kcal · ${wholeNumber(nutrients.proteinG)} g protein`;

const AT_MEAL: Record<Meal, string> = {
  breakfast: "at breakfast",
  lunch: "at lunch",
  dinner: "at dinner",
  snacks: "as a snack",
};

// "160–310 kcal left to be in range": from the bottom of the range to its top
const leftToTop = (amount: number, { min, max }: NutritionRange) => {
  const shown = Math.round(amount);
  return `${wholeNumber(min - shown)}–${wholeNumber(max - shown)}`;
};

// The Coach's words under Today's rings and on the Ideas half (spec #158 stories 33 to 35 and 39, #188 story 10): the
// rings' own states, for kcal and protein only, as fibre and water stay goals rather than shortfalls
export function coachSummary({ targets, totals, ideas, ideaMeal }: Day): CoachSummary {
  const ranges = nutritionRanges(targets);
  const kcal = rangeState(totals.kcal, ranges.kcal);
  const protein = rangeState(totals.proteinG, ranges.proteinG);
  const kcalLeft = `${leftToTop(totals.kcal, ranges.kcal)} kcal`;
  const proteinLeft = `${leftToTop(totals.proteinG, ranges.proteinG)} g of protein`;
  const kcalDone = kcal.state === "in" ? "Calories in range" : `${wholeNumber(kcal.by)} kcal over`;
  const proteinOver = `${wholeNumber(protein.by)} g of protein over`;

  if (protein.state !== "below") {
    if (kcal.state === "below") {
      const proteinDone = protein.state === "in" ? "Protein in range" : proteinOver;
      return { headline: `${proteinDone}, with ${kcalLeft} left to be in range.`, line: null };
    }
    if (kcal.state === "in" && protein.state === "in")
      return { headline: "Calories and protein in range.", line: null };
    return { headline: `${kcalDone}, ${protein.state === "in" ? "protein in range" : proteinOver}.`, line: null };
  }

  const headline = `${kcal.state === "below" ? `${kcalLeft} and` : `${kcalDone}, with`} ${proteinLeft} left to be in range.`;
  if (kcal.state === "over") return { headline, line: null };
  if (!ideas.length) return { headline, line: "None of the Food Ideas fits under the top of the kcal range." };

  const names = ideas.map((idea, i) => (i ? idea.name.charAt(0).toLowerCase() + idea.name.slice(1) : idea.name));
  const covered = ideas.reduce((sum, idea) => sum + idea.nutrients.proteinG, 0);
  const share =
    rangeState(totals.proteinG + covered, ranges.proteinG).state === "below" ? `${wholeNumber(covered)} g` : "all";
  return { headline, line: `${names.join(" and ")} ${AT_MEAL[ideaMeal]} would cover ${share} of the protein.` };
}
