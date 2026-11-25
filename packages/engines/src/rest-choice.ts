import { z } from "zod";

// The rest the user chooses on Today (#178): Auto, each Exercise's own, or one length for every Exercise. Kept on the
// phone only, so it shapes how a Workout is done but never the stored plan (ADR 0003)
export const RestChoice = z.union([z.literal("auto"), z.number().min(30).max(180).multipleOf(15)]);
export type RestChoice = z.infer<typeof RestChoice>;

// Auto, then 30 s to 3 min in 15 s steps
export const REST_CHOICES: readonly RestChoice[] = ["auto", 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180];

// The Auto rest after a Set (#95): what's left of the Set's time once the Set itself is done, but never under 45 seconds
const SET_SECONDS = 30;
const SHORTEST_REST_SECONDS = 45;

// The rest after a Set, on Auto the same for every Goal, one-sided Exercises and Assessment test Sets alike
export const restSeconds = (secondsPerSet: number, choice: RestChoice = "auto") =>
  choice === "auto" ? Math.max(SHORTEST_REST_SECONDS, secondsPerSet - SET_SECONDS) : choice;

// A Set's time with its rest at the choice: its secondsPerSet, less its Auto rest, plus the chosen one
export const secondsWithRest = (secondsPerSet: number, choice: RestChoice = "auto") =>
  secondsPerSet - restSeconds(secondsPerSet) + restSeconds(secondsPerSet, choice);
