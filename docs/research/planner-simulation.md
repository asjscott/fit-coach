# Simulation on the real planner

The rerun asked for by spec #77 and ticket #87. The percentages in `exercise-selection-by-goal.md` came from a throwaway greedy planner and assumed the hamstring tags were removed. These numbers come from `planWorkout()` and `daysWorkout()`, with the tags kept. Written 2026-11-04.

To reproduce: `pnpm --filter @fit/engines simulate` (`packages/engines/scripts/simulate-plans.ts`) prints every table.

## Result

- **Back squat and barbell bench do not show up meaningfully on a Full gym at Standard length.** Back squat gets 0 Sets a week at 4 days Standard for build_muscle, recomp and athletic, and 3 for lose_fat. Barbell bench gets 3 to 4 Sets, and 0 for lose_fat. Neither is ever the first Exercise of a Standard Workout.
- **The tables can't fix it.** Back squat and goblet squat have the same budgeted credit and the same load factor, so they score exactly the same at every table value. The library's order settles the tie, and goblet squat comes first. See [Why the tables can't fix it](#why-the-tables-cant-fix-it).
- **Proposed change, not made:** a small barbell tilt in the score. See [Proposed change](#proposed-change). It changes the spec's score formula, so it's your decision.
- **Loaded work is otherwise healthy.** 79 to 90% of Sets are loaded on a Full gym at Standard, though 5 to 25% of all Sets are bands, because band Exercises count as external. On a Full home gym at 4 days, lose_fat is 72% loaded against the research's 63%.
- **Workouts fill their Length, so weeks run well over budget.** At 4 days Standard on a Full gym, build_muscle gets 81 Sets in 179 minutes and 103 to 175% of each Muscle's budget. The research stopped at the budget: 49 Sets in 83 minutes for lose_fat on a Full home gym, where the real planner gives 82 Sets in 177 minutes. This follows the spec (story 22, "a Planned Workout anyway"), but the spec didn't weigh it. See [Open questions](#open-questions).

## Method

- Four weeks of Workouts, each done exactly as planned at the usual Length, spread from Monday. Each Workout is planned after the ones before it are logged, as the server does. Tables show the average of weeks 2 to 4, so last week's Exercises can carry on.
- Equipment: the built-in Full gym, and the Full home gym preset with a 20 kg bar, plates and dumbbells to 40 kg.
- Lifters, by Reference Strength in kg for squat, hinge, push, pull, core: intermediate 100, 120, 80, 80, 60 at 80 kg; novice 50, 60, 40, 40, 30 at 75 kg. No injuries. Working Levels are worked out from these, as they are for a profile added after the Assessment.
- **Loaded %** is Sets of Exercises with external load, **Bands %** the part of all Sets that are band Exercises, and **Of budget** the lowest and highest Muscle's credited Sets against its budget. A number in brackets is how many Workouts across the 3 weeks opened with that Exercise.

## Full gym, intermediate

| Goal         | Days | Length   | Sets | Minutes | Loaded % | Bands % | Back squat Sets | Bench Sets | Of budget | Short of budget                                                                                      |
| ------------ | ---- | -------- | ---- | ------- | -------- | ------- | --------------- | ---------- | --------- | ---------------------------------------------------------------------------------------------------- |
| build_muscle | 4    | standard | 81   | 179     | 85       | 10      | 0 (0)           | 4 (0)      | 103–175%  | none                                                                                                 |
| build_muscle | 3    | standard | 60   | 131     | 90       | 10      | 0 (0)           | 3 (0)      | 83–150%   | hamstrings 13.5/14, side_delts 7.5/9                                                                 |
| build_muscle | 4    | long     | 110  | 240     | 83       | 5       | 3 (0)           | 7 (0)      | 125–265%  | none                                                                                                 |
| build_muscle | 2    | short    | 25   | 59      | 84       | 12      | 3 (0)           | 0 (0)      | 33–100%   | quads 7.5/12, hamstrings 6/12, chest 4/12, lats 6/12, upper_back 7.5/12, side_delts 3/8, abs 6.5/8   |
| build_muscle | 6    | standard | 119  | 266     | 87       | 7       | 0 (0)           | 6 (0)      | 119–220%  | none                                                                                                 |
| recomp       | 4    | standard | 82   | 179     | 85       | 11      | 0 (0)           | 4 (0)      | 113–214%  | none                                                                                                 |
| recomp       | 3    | standard | 59   | 134     | 88       | 8       | 0 (0)           | 5 (0)      | 107–175%  | none                                                                                                 |
| recomp       | 4    | long     | 112  | 238     | 82       | 13      | 3 (3)           | 7 (0)      | 163–286%  | none                                                                                                 |
| recomp       | 2    | short    | 27   | 59      | 78       | 11      | 0 (0)           | 0 (0)      | 41–125%   | quads 4.5/11, hamstrings 6/11, glutes 9/11, chest 6/11, lats 6/11, upper_back 9/11, side_delts 4.5/6 |
| recomp       | 6    | standard | 116  | 264     | 86       | 5       | 0 (0)           | 8 (0)      | 125–250%  | none                                                                                                 |
| lose_fat     | 4    | standard | 89   | 175     | 83       | 22      | 3 (0)           | 0 (0)      | 113–236%  | none                                                                                                 |
| lose_fat     | 3    | standard | 69   | 134     | 80       | 25      | 0 (0)           | 0 (0)      | 107–217%  | none                                                                                                 |
| lose_fat     | 4    | long     | 126  | 240     | 79       | 21      | 4 (0)           | 0 (0)      | 150–343%  | none                                                                                                 |
| lose_fat     | 2    | short    | 29   | 59      | 79       | 31      | 0 (0)           | 0 (0)      | 50–105%   | quads 5.5/11, hamstrings 6.5/11, chest 6/11, lats 6/11, upper_back 10.5/11, side_delts 4/6           |
| lose_fat     | 6    | standard | 134  | 266     | 81       | 20      | 3 (0)           | 0 (0)      | 140–292%  | none                                                                                                 |
| athletic     | 4    | standard | 86   | 178     | 79       | 9       | 0 (0)           | 3 (0)      | 105–188%  | none                                                                                                 |
| athletic     | 3    | standard | 63   | 132     | 86       | 5       | 0 (0)           | 0 (0)      | 83–171%   | side_delts 7.5/9                                                                                     |
| athletic     | 4    | long     | 118  | 238     | 84       | 13      | 0 (0)           | 3 (0)      | 140–272%  | none                                                                                                 |
| athletic     | 2    | short    | 25   | 58      | 68       | 0       | 0 (0)           | 0 (0)      | 38–100%   | quads 4.5/12, hamstrings 6/12, glutes 9/12, chest 5/12, lats 6/12, upper_back 10/12, side_delts 4/8  |
| athletic     | 6    | standard | 122  | 264     | 81       | 5       | 0 (0)           | 5 (0)      | 115–240%  | none                                                                                                 |

## At 4 days Standard, the other cases

Back squat Sets, then bench Sets, a week.

| Goal         | Full gym, novice | Full home gym, intermediate | Full home gym, novice |
| ------------ | ---------------- | --------------------------- | --------------------- |
| build_muscle | 0, 4             | 0, 4                        | 0, 4                  |
| recomp       | 0, 4             | 0, 3                        | 0, 3                  |
| lose_fat     | 0, 0             | 0, 0                        | 0, 0                  |
| athletic     | 0, 3             | 0, 6                        | 0, 3                  |

A week of build_muscle, intermediate, on a Full gym:

- Deadlift ×3, Renegade row ×3, Goblet squat ×3, Pull-up ×3, Dumbbell bench press ×3, Barbell bench press ×1, Lateral raise ×3
- Deadlift ×3, Dumbbell overhead press ×3, Dumbbell Bulgarian split squat ×3, Renegade row ×3, Archer push-up ×3, Dumbbell bench press ×3
- Dumbbell Bulgarian split squat ×3, One-arm dumbbell row ×3, Dumbbell reverse lunge ×3, Barbell bench press ×3, Pull-up ×3, Band chest press ×3, Lateral raise ×3
- Kettlebell swing ×3, Dumbbell Romanian deadlift ×3, Goblet squat ×3, One-arm dumbbell row ×3, Dumbbell overhead press ×3, Band overhead press ×3, Archer push-up ×3, Band lat pulldown ×2

Band Exercises beat the cable ones the same way: `band-lat-pulldown` ties `lat-pulldown` and comes first in the library.

## Why the tables can't fix it

The score reads only an Exercise's budgeted credits and whether its load is external.

- **Back squat and goblet squat tie exactly.** Both credit quads and glutes 1 and abs 0.5. Back squat's other secondary Muscles (adductors, lower back) aren't budgeted. Goblet squat comes first in the library, so it wins until the variety cap stops it after 2 Workouts.
- **Then the one-sided dumbbell squats outscore back squat.** They credit hamstrings 0.5 in place of abs, and abs fill first, on a smaller budget with credit from many Exercises. These are the hamstring tags the research wanted removed and the spec keeps. They run out only on Long, which is where back squat appears.
- **Barbell and dumbbell bench tie exactly** too, which gives dumbbell bench first call on a week's 2 Workouts.
- **Bench can't be first.** Chest is its only budgeted primary Muscle, so it scores about 1.15 at the start of a week against about 2.9 for a squat. Triceps and front delts aren't budgeted. Workouts open with whatever is furthest behind, and that's a two-Muscle lift.
- **lose_fat tilts away from both on purpose**: at 180 seconds per Set, they sit at the floor of its 0.9 factor.

Tried on build_muscle, 4 days Standard, Full gym, intermediate:

| Change                            | Sets | Back squat | Bench | Of budget | Note                                   |
| --------------------------------- | ---- | ---------- | ----- | --------- | -------------------------------------- |
| Spec's tables                     | 81   | 0          | 4     | 103–175%  |                                        |
| External load factor 1 (was 1.15) | 80   | 0          | 4     | 103–175%  | Loaded falls to 69%                    |
| External load factor 1.3          | 82   | 0          | 6     | 103–184%  |                                        |
| External load factor 1.5          | 85   | 0          | 3     | 103–188%  |                                        |
| Main Muscle target 12 (was 16)    | 79   | 0          | 3     | 120–225%  |                                        |
| Main Muscle target 20             | 80   | 0          | 6     | 80–143%   | Short on quads, hamstrings, side delts |
| **Not table changes**             |      |            |       |           |                                        |
| Barbell Exercises win ties        | 71   | 6          | 4     | 70–169%   | Short on side delts, 7/10              |
| Barbell score factor 1.02         | 70   | 6          | 6     | 65–169%   | Short on side delts, 6.5/10            |
| Barbell score factor 1.05         | 69   | 6          | 6     | 65–169%   | Short on lats 15/16, side delts 6.5/10 |
| Barbell score factor 1.1          | 70   | 6          | 6     | 70–169%   | Short on side delts, 7/10              |

Those were temporary patches, not left in the code.

## Proposed change

Add one row to the tilts in `plan-score.ts`: an Exercise that needs a barbell scores × 1.02. It only has to break ties, so the smallest value that does is the one to use.

- **Effect:** 6 Sets each of back squat and barbell bench at 4 days Standard for build_muscle, and 3 of back squat at 3 days. At 6 days, 9 each, and bench opens 6 of the 18 Workouts.
- **Cost:** barbell Sets take 180 seconds, so a week drops from 81 to 70 Sets and side delts fall to 65% of budget. If that matters, a Lateral raise could go earlier, but that would be a separate fill-order question.
- **What it doesn't do:** lose_fat stays at 0 bench at 6 days, the one lose_fat case tried, since its time tilt outweighs 1.02. That fits its "shorter Workouts" intent. Bench stays out of first place at 4 days. I'd drop "first" as a goal, since Sets per week are what count.
- **Why not reorder the library:** it gives nearly the same result in one line, but array order would then be a hidden tuning dial, and it can't be read or tested as a rule.
- **Why it wasn't done:** the spec's score is `credit × remaining ÷ budget × 1.15 × Goal factor`, with Goal factor 1 for build_muscle and recomp. A new factor changes that formula, and the same reasoning may also want to favour cable over band Exercises.

## Open questions

- **Should a Workout stop at the budget?** At 4 days Standard, a Muscle reaches up to 236% of budget for lose_fat, for which the research found no benefit from extra Sets. Letting a Workout end early once the week's budget is met would give shorter Workouts, but spec story 22 and Workout Length both read as "fill the time".
- **lose_fat is 20 to 31% bands on a Full gym.** The time tilt still favours them at their 75 seconds, as the research warned.
- **2 days Short** reaches only 33 to 50% of the budget on its worst Muscle. The spec's known limits expected this.

## Limits of this model

- Every Workout is done exactly as planned, with no skipped Sets or Manual Workouts, and Assessment Workouts aren't counted.
- Workouts fall on fixed days, and Working Levels don't change, as progression is M6.
- The planner is deterministic, so the 3 averaged weeks are one repeating cycle, not 3 samples.
