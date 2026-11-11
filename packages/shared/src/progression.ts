import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9-]+$/);

// Why progression changed a Working Level (#132), which the Planned Workout shows with the Exercise. Later rules add
// codes. On a Working Level:
// - target-up: every Set reached the target, so the target went up 1 rep
// - seconds-up: every Set of a timed Exercise reached the target, so it went up 5 seconds (#135)
// - load-up: every Set reached the top of the range, so the load went up one Load Step, to the reps Epley predicts; for
//   a band Exercise, to the next band at the bottom of the range (#135)
// - new-base: the user lifted a load other than the one prescribed, which became the level's load
// - outgrown: 20 reps on every Set with no Load Step (or band) to take; 15 reps or 60 seconds on every Set of a
//   bodyweight or timed Exercise (#135)
// Only on a Planned Exercise, as the planner words outgrown: harder-variant, the Exercise given in place of the outgrown
// one (from); held-at-top, the outgrown Exercise itself, when the profile can't do its harder variant
export const ProgressionChange = z.discriminatedUnion("code", [
  z.object({ code: z.literal("target-up") }),
  z.object({ code: z.literal("seconds-up") }),
  z.object({ code: z.literal("load-up") }),
  z.object({ code: z.literal("new-base") }),
  z.object({ code: z.literal("outgrown") }),
  z.object({ code: z.literal("harder-variant"), from: slug }),
  z.object({ code: z.literal("held-at-top") }),
]);
export type ProgressionChange = z.infer<typeof ProgressionChange>;
