# Simulation on the real planner

The rerun asked for by spec #77 and ticket #87. The percentages in `exercise-selection-by-goal.md` came from a throwaway greedy planner and assumed the hamstring tags were removed. These numbers come from `planWorkout()` and `daysWorkout()`, with the tags kept. Written 2026-11-04.

To reproduce: `pnpm --filter @fit/engines simulate` (`packages/engines/scripts/simulate-plans.ts`) prints every table.

## Result

- **Back squat and barbell bench now show up on a Full gym for build_muscle and recomp, after adding a barbell factor of 1.02 to the score.** At 4 days Standard, build_muscle gets 6 Sets of each and recomp gets 3 of back squat and 6 of bench. Neither opens a Standard Workout at 4 days, and at 6 days they sometimes do.
- **lose_fat and athletic still get little.** At 4 days Standard, lose_fat gets none of either, as its time tilt outweighs 1.02. Athletic gets 3 Sets of bench and no back squat. Its Ballistic and one-sided picks look like the reason, though that wasn't isolated. Athletic gets back squat at 4 days Long (8 Sets) and 6 days Standard (3).
- **The cost is a smaller week.** Barbell Sets take 180 seconds, so build_muscle at 4 days Standard falls from 81 to 70 Sets in 176 minutes, and side delts fall to 65% of budget.
- **The tables alone couldn't do this.** See [Why the tables can't fix it](#why-the-tables-cant-fix-it).
- **Loaded work is healthy.** 78 to 94% of Sets are loaded on a Full gym at Standard, and 0 to 23% of all Sets are bands, because band Exercises count as external. On a Full home gym at 4 days, lose_fat is 78% loaded against the research's 63%.
- **Workouts fill their Length, so weeks run over budget.** At 4 days Standard on a Full gym, build_muscle gets up to 169% of a Muscle's budget. The research stopped at the budget: 49 Sets in 83 minutes for lose_fat on a Full home gym, where the real planner gives 80 Sets in 175 minutes. This follows the spec (story 22, "a Planned Workout anyway"), but the spec didn't weigh it. See [Open questions](#open-questions).

## Method

- Four weeks of Workouts, each done exactly as planned at the usual Length, spread from Monday. Each Workout is planned after the ones before it are logged, as the server does. Tables show the average of weeks 2 to 4, so last week's Exercises can carry on.
- Equipment: the built-in Full gym, and the Full home gym preset with a 20 kg bar, plates and dumbbells to 40 kg.
- Lifters, by Reference Strength in kg for squat, hinge, push, pull, core: intermediate 100, 120, 80, 80, 60 at 80 kg; novice 50, 60, 40, 40, 30 at 75 kg. No injuries. Working Levels are worked out from these, as they are for a profile added after the Assessment.
- **Loaded %** is Sets of Exercises with external load, **Bands %** the part of all Sets that are band Exercises, and **Of budget** the lowest and highest Muscle's credited Sets against its budget. A number in brackets is how many Workouts across the 3 weeks opened with that Exercise.

## Full gym, intermediate

| Goal         | Days | Length   | Sets | Minutes | Loaded % | Bands % | Back squat Sets | Bench Sets | Of budget | Short of budget                                                                                                    |
| ------------ | ---- | -------- | ---- | ------- | -------- | ------- | --------------- | ---------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| build_muscle | 4    | standard | 70   | 176     | 91       | 1       | 6 (0)           | 6 (0)      | 65–169%   | side_delts 6.5/10                                                                                                  |
| build_muscle | 3    | standard | 53   | 129     | 89       | 6       | 3 (0)           | 3 (0)      | 83–143%   | hamstrings 13/14, chest 12/14, lats 12/14, side_delts 7.5/9                                                        |
| build_muscle | 4    | long     | 103  | 239     | 83       | 6       | 7 (3)           | 7 (0)      | 120–231%  | none                                                                                                               |
| build_muscle | 2    | short    | 21   | 57      | 71       | 0       | 3 (0)           | 0 (0)      | 25–75%    | quads 4.5/12, hamstrings 6/12, glutes 9/12, chest 3/12, lats 6/12, upper_back 9/12, side_delts 3/8, abs 6/8        |
| build_muscle | 6    | standard | 105  | 266     | 88       | 3       | 9 (0)           | 9 (6)      | 105–210%  | none                                                                                                               |
| recomp       | 4    | standard | 73   | 177     | 84       | 8       | 3 (0)           | 6 (0)      | 107–200%  | none                                                                                                               |
| recomp       | 3    | standard | 54   | 134     | 94       | 6       | 6 (0)           | 6 (0)      | 100–175%  | none                                                                                                               |
| recomp       | 4    | long     | 104  | 237     | 85       | 11      | 6 (3)           | 8 (0)      | 144–250%  | none                                                                                                               |
| recomp       | 2    | short    | 20   | 59      | 85       | 0       | 3 (0)           | 3 (0)      | 27–82%    | quads 4.5/11, hamstrings 6/11, glutes 9/11, chest 3/11, lats 6/11, upper_back 9/11, side_delts 2/6, abs 4.5/6      |
| recomp       | 6    | standard | 107  | 261     | 86       | 7       | 6 (3)           | 6 (0)      | 110–233%  | none                                                                                                               |
| lose_fat     | 4    | standard | 89   | 174     | 78       | 18      | 0 (0)           | 0 (0)      | 119–214%  | none                                                                                                               |
| lose_fat     | 3    | standard | 69   | 133     | 83       | 23      | 0 (0)           | 0 (0)      | 121–217%  | none                                                                                                               |
| lose_fat     | 4    | long     | 126  | 240     | 79       | 21      | 4 (0)           | 0 (0)      | 150–343%  | none                                                                                                               |
| lose_fat     | 2    | short    | 29   | 59      | 79       | 31      | 0 (0)           | 0 (0)      | 50–105%   | quads 5.5/11, hamstrings 6.5/11, chest 6/11, lats 6/11, upper_back 10.5/11, side_delts 4/6                         |
| lose_fat     | 6    | standard | 135  | 265     | 78       | 20      | 3 (0)           | 0 (0)      | 147–297%  | none                                                                                                               |
| athletic     | 4    | standard | 79   | 176     | 81       | 0       | 0 (0)           | 3 (0)      | 103–169%  | none                                                                                                               |
| athletic     | 3    | standard | 59   | 133     | 85       | 10      | 0 (0)           | 5 (0)      | 83–150%   | side_delts 7.5/9                                                                                                   |
| athletic     | 4    | long     | 107  | 238     | 82       | 9       | 8 (0)           | 7 (0)      | 125–241%  | none                                                                                                               |
| athletic     | 2    | short    | 24   | 59      | 75       | 0       | 0 (0)           | 0 (0)      | 25–88%    | quads 4.5/12, hamstrings 7.5/12, glutes 9/12, chest 3/12, lats 6/12, upper_back 10.5/12, side_delts 4.5/8, abs 6/8 |
| athletic     | 6    | standard | 113  | 265     | 83       | 3       | 3 (0)           | 9 (3)      | 100–213%  | none                                                                                                               |

## At 4 days Standard, the other cases

Back squat Sets, then bench Sets, a week.

| Goal         | Full gym, novice | Full home gym, intermediate | Full home gym, novice |
| ------------ | ---------------- | --------------------------- | --------------------- |
| build_muscle | 6, 4             | 6, 6                        | 6, 4                  |
| recomp       | 6, 6             | 3, 6                        | 6, 6                  |
| lose_fat     | 3, 0             | 0, 1                        | 0, 0                  |
| athletic     | 0, 5             | 2, 4                        | 0, 4                  |

A week of build_muscle, intermediate, on a Full gym:

- Deadlift ×3, Renegade row ×3, Back squat ×3, Pull up ×3, Barbell bench press ×3, Dumbbell lateral raise ×1
- Deadlift ×3, Barbell overhead press ×3, Archer push up ×3, Dumbbell bulgarian split squat ×3, Renegade row ×3, Dumbbell lateral raise ×3
- Dumbbell bulgarian split squat ×3, Barbell bench press ×3, One arm dumbbell row ×3, Dumbbell reverse lunge ×3, Landmine press ×3, Barbell overhead press ×2
- Barbell romanian deadlift ×3, Landmine press ×3, One arm dumbbell row ×3, Kettlebell swing ×3, Back squat ×3, Dumbbell bench press ×3, Band row ×1

Band Exercises beat the cable ones the same way: `band-lat-pulldown` ties `lat-pulldown` and comes first in the library.

## Why the tables can't fix it

This is why the barbell factor exists. It describes the score without the factor.

The score reads only an Exercise's budgeted credits and whether its load is external.

- **Back squat and goblet squat tie exactly.** Both credit quads and glutes 1 and abs 0.5. Back squat's other secondary Muscles (adductors, lower back) aren't budgeted. Goblet squat comes first in the library, so it wins until the variety cap stops it after 2 Workouts.
- **Then the one-sided dumbbell squats outscore back squat.** They credit hamstrings 0.5 in place of abs, and abs fill first, on a smaller budget with credit from many Exercises. These are the hamstring tags the research wanted removed and the spec keeps. They run out only on Long, which is where back squat appears.
- **Barbell and dumbbell bench tie exactly** too, which gives dumbbell bench first call on a week's 2 Workouts.
- **Bench can't be first.** Chest is its only budgeted primary Muscle, so it scores about 1.15 at the start of a week against about 2.9 for a squat. Triceps and front delts aren't budgeted. Workouts open with whatever is furthest behind, and that's a two-Muscle lift.
- **lose_fat tilts away from both on purpose**: at 180 seconds per Set, they sit at the floor of its 0.9 factor.

Tried on build_muscle, 4 days Standard, Full gym, intermediate, before the factor was added:

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

Those were temporary patches, not left in the code. They ran before the cut followed the order Sets were picked in. The first row still matches, but the others weren't rerun.

## The barbell factor

An Exercise that needs a barbell scores × 1.02 (`plan-score.ts`). It only has to break ties, so it's the smallest value that does. It adds to the spec's score, `credit × remaining ÷ budget × 1.15 × Goal factor`, and was agreed after the spec.

- **What counts:** every Exercise whose equipment always includes a barbell, so landmine press gets the factor too, alongside back squat, deadlift, the Romanian deadlift, bench and overhead press.
- **Why not reorder the library:** it gives nearly the same result in one line, but array order would then be a hidden tuning dial, and it can't be read or tested as a rule.
- **Bench stays out of first place at 4 days.** Sets per week are what count, so that's accepted.
- **Cable and band ties remain.** The same reasoning may want to favour cable over band Exercises: `band-lat-pulldown` still ties `lat-pulldown`.
- **Side delts at 65% on build_muscle:** a Lateral raise could go earlier, but that's a separate fill-order question.

## Open questions

- **Should a Workout stop at the budget?** At 4 days Standard, a Muscle reaches up to 214% of budget for lose_fat, for which the research found no benefit from extra Sets. Letting a Workout end early once the week's budget is met would give shorter Workouts, but spec story 22 and Workout Length both read as "fill the time".
- **lose_fat is 18 to 31% bands on a Full gym.** The time tilt still favours them at their 75 seconds, as the research warned.
- **2 days Short** reaches only 25 to 50% of the budget on its worst Muscle. The spec's known limits expected this.

## Limits of this model

- Every Workout is done exactly as planned, with no skipped Sets or Manual Workouts, and Assessment Workouts aren't counted.
- Workouts fall on fixed days, and Working Levels don't change, as progression is M6.
- The planner is deterministic, so the 3 averaged weeks are one repeating cycle, not 3 samples.
