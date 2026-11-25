import { z } from "zod";
import { LocalDate } from "./check-in";
import { Food, PortionChoice } from "./food";
import { Meal } from "./food-entry";

// GET /tell-the-coach: whether the box shows. It doesn't when the API has no Gemini key, which the phone never sees
export const TellTheCoachStatus = z.object({ available: z.boolean() });
export type TellTheCoachStatus = z.infer<typeof TellTheCoachStatus>;

// POST /tell-the-coach: what the user ate, in their own words, and today's date on the phone, which "yesterday" counts
// back from. Food descriptions only, never photos
export const TellTheCoach = z.object({ text: z.string().trim().min(1).max(500), today: LocalDate });
export type TellTheCoach = z.infer<typeof TellTheCoach>;

// One food the Coach understood from the words: its day (today or yesterday), meal and portion. Nothing is logged until
// the user confirms it, which posts it to POST /days/:date/food-entries as an ordinary Food Entry
export const FoodProposal = z.object({ date: LocalDate, meal: Meal, food: Food, portion: PortionChoice });
export type FoodProposal = z.infer<typeof FoodProposal>;

// The foods the Coach understood, in the order they were said. None when the words held no food
export const FoodProposals = z.object({ proposals: z.array(FoodProposal) });
export type FoodProposals = z.infer<typeof FoodProposals>;
