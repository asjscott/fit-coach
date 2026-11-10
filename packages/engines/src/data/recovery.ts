import type { Exercise } from "@fit/shared";

// The Recovery Exercises, for the Recovery Workout only (recovery-workout.ts). All timed, with no Pattern: they credit
// nothing, and the planner never picks them. The muscles say what they loosen, for the Exercise's page

const recovery = (exercise: Omit<Exercise, "recovery" | "ballistic" | "patterns" | "loadType" | "videoUrl">) =>
  ({
    ...exercise,
    patterns: [],
    loadType: "timed",
    ballistic: false,
    recovery: true,
    videoUrl: null,
  }) satisfies Exercise;

export const RECOVERY: Exercise[] = [
  recovery({
    slug: "walk",
    name: "Walk",
    muscles: { primary: ["quads", "glutes", "calves"], secondary: ["hamstrings"] },
    equipmentOptions: [[]],
    unilateral: false,
    secondsPerSet: 1200,
    regression: null,
    progression: null,
    avoidWith: [],
    cues: ["An easy pace you could talk at", "Outside if you can", "Swing your arms, stand tall"],
  }),
  recovery({
    slug: "hip-flexor-stretch",
    name: "Hip flexor stretch",
    muscles: { primary: ["quads"], secondary: ["glutes", "abs"] },
    equipmentOptions: [[]],
    unilateral: true,
    secondsPerSet: 100,
    regression: null,
    progression: null,
    avoidWith: [],
    cues: [
      "Half-kneel, back knee on something soft",
      "Squeeze the back leg's glute",
      "Shift forward until the hip front stretches",
    ],
  }),
  recovery({
    slug: "open-book",
    name: "Open book",
    muscles: { primary: ["upper_back"], secondary: ["chest", "obliques"] },
    equipmentOptions: [[]],
    unilateral: true,
    secondsPerSet: 100,
    regression: null,
    progression: null,
    avoidWith: [],
    cues: [
      "Lie on your side, knees bent and stacked",
      "Open your top arm across to the floor behind",
      "Eyes follow your hand",
    ],
  }),
  recovery({
    slug: "cat-cow",
    name: "Cat-cow",
    muscles: { primary: ["lower_back"], secondary: ["abs", "upper_back"] },
    equipmentOptions: [[]],
    unilateral: false,
    secondsPerSet: 60,
    regression: null,
    progression: null,
    avoidWith: [],
    cues: ["On hands and knees", "Round your back up, then let it sag", "Move slowly with your breath"],
  }),
  recovery({
    slug: "worlds-greatest-stretch",
    name: "World's greatest stretch",
    muscles: { primary: ["glutes", "hamstrings"], secondary: ["quads", "adductors", "upper_back"] },
    equipmentOptions: [[]],
    unilateral: true,
    secondsPerSet: 100,
    regression: null,
    progression: null,
    avoidWith: [],
    cues: [
      "Long lunge, hands inside the front foot",
      "Rotate, reaching your inside arm up",
      "Back knee off the floor if you can",
    ],
  }),
];
