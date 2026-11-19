import type { Day, FoodIdea, Meal } from "@fit/shared";

export type CoachSummary = {
  // What's left of the day's kcal and protein, or that they're met
  headline: string;
  // How the Food Ideas would fill what's left; null once a target is met
  line: string | null;
};

const whole = (value: number) => Math.round(value).toLocaleString();

// A Food Idea's set portion and what it holds: "½ block · 216 kcal · 26 g protein"
export const ideaLine = ({ portion, nutrients }: FoodIdea) =>
  `${portion.label} · ${whole(nutrients.kcal)} kcal · ${whole(nutrients.proteinG)} g protein`;

const AT_MEAL: Record<Meal, string> = {
  breakfast: "at breakfast",
  lunch: "at lunch",
  dinner: "at dinner",
  snacks: "as a snack",
};

// The Coach's words under Today's rings and on the Ideas half (spec #158 stories 33 to 35 and 39). It speaks only of
// kcal and protein, never fibre or water, which stay goals rather than shortfalls. What's left is rounded as the rings
// show it, so a ring at 0 left reads as met here too
export function coachSummary({ targets, totals, ideas, ideaMeal }: Day): CoachSummary {
  const kcalLeft = Math.max(0, Math.round(targets.kcal - totals.kcal));
  const proteinLeft = Math.max(0, Math.round(targets.proteinG - totals.proteinG));

  if (!kcalLeft && !proteinLeft) return { headline: "Calorie and protein targets met.", line: null };
  if (!kcalLeft) return { headline: `Calorie target met, with ${whole(proteinLeft)} g of protein left.`, line: null };
  if (!proteinLeft) return { headline: `Protein target met, with ${whole(kcalLeft)} kcal left.`, line: null };

  const headline = `${whole(kcalLeft)} kcal and ${whole(proteinLeft)} g of protein left.`;
  if (!ideas.length) return { headline, line: "None of the Food Ideas fits in the kcal left." };

  const names = ideas.map((idea, i) => (i ? idea.name.charAt(0).toLowerCase() + idea.name.slice(1) : idea.name));
  const covered = ideas.reduce((sum, idea) => sum + idea.nutrients.proteinG, 0);
  const share = covered >= proteinLeft ? "all" : `${whole(covered)} g`;
  return { headline, line: `${names.join(" and ")} ${AT_MEAL[ideaMeal]} would cover ${share} of the protein.` };
}
