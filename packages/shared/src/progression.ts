import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9-]+$/);

// Why progression changed a Working Level (#132), which the Planned Workout shows with the Exercise. Later rules add
// codes. On a Working Level:
// - target-up: every Set reached the target, so the target went up 1 rep
// - load-up: every Set reached the top of the range, so the load went up one Load Step, to the reps Epley predicts
// - new-base: the user lifted a load other than the one prescribed, which became the level's load
// - outgrown: 20 reps on every Set with no Load Step to take
// - load-down: a second Miss in a row (#134), so the load went down one Load Step, to the bottom of the range
// - target-down: a second Miss in a row (#134) where a Load Step down is too big or there's none, or on a bodyweight,
//   band or timed Exercise, so the target went down 2 reps or 10 seconds
// Only on a Planned Exercise, as the planner words outgrown: harder-variant, the Exercise given in place of the outgrown
// one (from); held-at-top, the outgrown Exercise itself, when the profile can't do its harder variant
export const ProgressionChange = z.discriminatedUnion("code", [
  z.object({ code: z.literal("target-up") }),
  z.object({ code: z.literal("load-up") }),
  z.object({ code: z.literal("new-base") }),
  z.object({ code: z.literal("outgrown") }),
  z.object({ code: z.literal("load-down") }),
  z.object({ code: z.literal("target-down") }),
  z.object({ code: z.literal("harder-variant"), from: slug }),
  z.object({ code: z.literal("held-at-top") }),
]);
export type ProgressionChange = z.infer<typeof ProgressionChange>;
