import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9-]+$/);

// Why progression changed a Working Level (#132), which the Planned Workout shows with the Exercise. Later rules add
// codes. On a Working Level:
// - target-up: every Set reached the target, so the target went up 1 rep
// - seconds-up: every Set of a timed Exercise reached the target, so it went up 5 seconds (#135)
// - load-up: every Set reached the top of the range, so the load went up one Load Step, to the reps Epley predicts; for
//   a band Exercise, to the next band at the bottom of the range (#135); for a weighted Ballistic Exercise, at its fixed 8
//   reps, after a last Set of RPE 7 or lower or a 3rd Workout without RPE (#136)
// - new-base: the user lifted a load other than the one prescribed, which became the level's load; the only way a carry
//   moves (#136)
// - outgrown: 20 reps on every Set with no Load Step (or band) to take; 15 reps or 60 seconds on every Set of a
//   bodyweight or timed Exercise (#135)
// - load-down: a second Miss in a row (#134), so the load went down one Load Step, to the bottom of the range
// - target-down: a second Miss in a row (#134) where a Load Step down is too big or there's none, or on a bodyweight,
//   band or timed Exercise, so the target went down 2 reps or 10 seconds
// - rpe-10: the Exercise's last Set was RPE 10, so the load and the target held
// Only on a Planned Exercise, as the planner words outgrown: harder-variant, the Exercise given in place of the outgrown
// one (from); held-at-top, the outgrown Exercise itself, when the profile can't do its harder variant
export const ProgressionChange = z.discriminatedUnion("code", [
  z.object({ code: z.literal("target-up") }),
  z.object({ code: z.literal("seconds-up") }),
  z.object({ code: z.literal("load-up") }),
  z.object({ code: z.literal("new-base") }),
  z.object({ code: z.literal("outgrown") }),
  z.object({ code: z.literal("load-down") }),
  z.object({ code: z.literal("target-down") }),
  z.object({ code: z.literal("rpe-10") }),
  z.object({ code: z.literal("harder-variant"), from: slug }),
  z.object({ code: z.literal("held-at-top") }),
]);
export type ProgressionChange = z.infer<typeof ProgressionChange>;
