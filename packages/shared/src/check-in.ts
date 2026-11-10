import { z } from "zod";

// A rating from 1 to 5: sleep and energy from poor to great, soreness from none to very
export const CheckInRating = z.number().int().min(1).max(5);

// How the user feels today, before training (GLOSSARY.md)
export const CheckIn = z.object({ sleep: CheckInRating, energy: CheckInRating, soreness: CheckInRating });
export type CheckIn = z.infer<typeof CheckIn>;
