import type { Exercise } from "@fit/shared";

// Jumps for the athletic Goal (#105): bodyweight Ballistic Exercises, done as a fixed number of contacts (ground
// landings) rather than to a Working Level. They form a ladder from the bodyweight squat, easiest first, and each
// credits 0.5 to quads and glutes only (creditsPerSet), so they add to strength work rather than replace it. The
// planner gives them only to an athletic user who turned them on (planWorkout, jumps.ts)

// Every jump is the same apart from these
type JumpFields = Pick<Exercise, "slug" | "name" | "equipmentOptions" | "regression" | "progression" | "cues">;

const jump = (fields: JumpFields): Exercise => ({
  patterns: [{ pattern: "squat", credit: 0.5 }],
  muscles: { primary: ["quads", "glutes"], secondary: ["calves", "hamstrings"] },
  loadType: "bodyweight",
  unilateral: false,
  ballistic: true,
  recovery: false,
  oneSet: false,
  // About 15 seconds of jumping and a minute's rest, so 12 Sets a week are about 15 minutes
  secondsPerSet: 75,
  avoidWith: ["knee", "ankle"],
  videoUrl: null,
  ...fields,
});

export const JUMPS: Exercise[] = [
  jump({
    slug: "pogo-hop",
    name: "Pogo hop",
    equipmentOptions: [[]],
    regression: "bodyweight-squat",
    progression: "squat-jump",
    cues: [
      "Small, quick hops on the balls of your feet",
      "Knees almost straight, ankles springy",
      "Spend as little time on the ground as you can",
    ],
  }),
  jump({
    slug: "squat-jump",
    name: "Squat jump",
    equipmentOptions: [[]],
    regression: "pogo-hop",
    progression: "countermovement-jump",
    cues: [
      "Pause at the bottom of a half squat",
      "Jump as high as you can from the pause",
      "Land softly, knees over toes",
    ],
  }),
  jump({
    slug: "countermovement-jump",
    name: "Countermovement jump",
    equipmentOptions: [[]],
    regression: "squat-jump",
    progression: "box-jump",
    cues: ["Dip fast and jump straight up", "Swing your arms up as you go", "Land softly, then reset before the next"],
  }),
  jump({
    slug: "box-jump",
    name: "Box jump",
    equipmentOptions: [["plyo_box"]],
    regression: "countermovement-jump",
    progression: "broad-jump",
    cues: ["A box you can land on in a quarter squat", "Land softly on the whole foot", "Step down, never jump down"],
  }),
  jump({
    slug: "broad-jump",
    name: "Broad jump",
    equipmentOptions: [[]],
    regression: "box-jump",
    progression: "lateral-bound",
    cues: [
      "Swing your arms and jump forward, not up",
      "Land on both feet and hold it",
      "Walk back and reset each time",
    ],
  }),
  jump({
    slug: "lateral-bound",
    name: "Lateral bound",
    equipmentOptions: [[]],
    regression: "broad-jump",
    progression: null,
    cues: [
      "Push off one leg and jump sideways",
      "Land on the other leg and hold it a second",
      "Each landing is one contact",
    ],
  }),
];
