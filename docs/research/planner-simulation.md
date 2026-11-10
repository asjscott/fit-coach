# Simulation on the real planner

The rerun asked for by spec #77 and ticket #87. The percentages in `exercise-selection-by-goal.md` came from a throwaway greedy planner and assumed the hamstring tags were removed. These numbers come from `planWorkout()` and `daysWorkout()`, with the tags kept. Written 2026-11-04.

**Update, 2026-11-06:** tables rerun after ties stopped falling to library order, which could decide outcomes: reversing it took recomp's bench to 0. `plan-outcomes.test.ts` now pins the outcomes that matter.

**Update, 2026-11-09:** tables rerun with the recovery filter (#93). See [The recovery filter](#the-recovery-filter) for the numbers chosen and what changed.

**Update, 2026-11-09:** athletic rows rerun with its weekly back squat (#100). See [Athletic's weekly squat](#athletics-weekly-squat).

To reproduce: `pnpm --filter @fit/engines simulate` (`packages/engines/scripts/simulate-plans.ts`) prints every table.

## Result

- **Back squat and barbell bench now show up on a Full gym for build_muscle and recomp, after adding a barbell factor of 1.02 to the score.** At 4 days Standard, build_muscle gets 6 Sets of each and recomp gets 3 of back squat and 6 of bench. Neither opens a Standard Workout at 4 days, and at 6 days they sometimes do.
- **lose_fat and athletic still get little.** At 4 days Standard, lose_fat gets none of either, as its time tilt outweighs 1.02. That's accepted as a known limit of spec #77. Athletic got no back squat at 4 days Standard, as the one-sided dumbbell squats outscore it. A weekly rule (#100) now gives it at least 3 Sets in every simulated combination, 6 at 4 days Standard, and bench stays at 3 to 6.
- **The cost is a smaller week.** Barbell Sets take 180 seconds, so build_muscle at 4 days Standard falls from 81 to 68 Sets in 175 minutes, and side delts fall to 65% of budget.
- **The tables alone couldn't do this.** See [Why the tables can't fix it](#why-the-tables-cant-fix-it).
- **Loaded work is healthy.** 78 to 94% of Sets are loaded on a Full gym at Standard, and 0 to 24% of all Sets are bands, because band Exercises count as external. On a Full home gym at 4 days, lose_fat is 78% loaded against the research's 63%.
- **Workouts fill their Length, so weeks run over budget.** At 4 days Standard on a Full gym, build_muscle gets up to 169% of a Muscle's budget. The research stopped at the budget: 49 Sets in 83 minutes for lose_fat on a Full home gym, where the real planner gives 80 Sets in 175 minutes. This follows the spec (story 22, "a Planned Workout anyway"), but the spec didn't weigh it. See [Open questions](#open-questions).

## Method

- Four weeks of Workouts, each done exactly as planned at the usual Length, spread from Monday. Each Workout is planned after the ones before it are logged, as the server does. Tables show the average of weeks 2 to 4, so last week's Exercises can carry on.
- Equipment: the built-in Full gym, and the Full home gym preset with a 20 kg bar, plates and dumbbells to 40 kg.
- Lifters, by Reference Strength in kg for squat, hinge, push, pull, core: intermediate 100, 120, 80, 80, 60 at 80 kg; novice 50, 60, 40, 40, 30 at 75 kg. No injuries. Working Levels are worked out from these, as they are for a profile added after the Assessment.
- **Loaded %** is Sets of Exercises with external load, **Bands %** the part of all Sets that are band Exercises, and **Of budget** the lowest and highest Muscle's credited Sets against its budget. A number in brackets is how many Workouts across the 3 weeks opened with that Exercise.

## Full gym, intermediate

| Goal         | Days | Length   | Sets | Minutes | Loaded % | Bands % | Back squat Sets | Bench Sets | Of budget | Short of budget                                                                                                 |
| ------------ | ---- | -------- | ---- | ------- | -------- | ------- | --------------- | ---------- | --------- | --------------------------------------------------------------------------------------------------------------- |
| build_muscle | 4    | standard | 68   | 175     | 91       | 0       | 6 (0)           | 6 (0)      | 65–169%   | lats 15/16, side_delts 6.5/10                                                                                   |
| build_muscle | 3    | standard | 53   | 132     | 89       | 0       | 3 (0)           | 3 (0)      | 83–143%   | hamstrings 13/14, chest 12/14, lats 12/14, side_delts 7.5/9                                                     |
| build_muscle | 4    | long     | 104  | 238     | 83       | 6       | 8 (3)           | 7 (0)      | 106–255%  | none                                                                                                            |
| build_muscle | 2    | short    | 21   | 57      | 71       | 0       | 3 (0)           | 0 (0)      | 25–75%    | quads 4.5/12, hamstrings 6/12, glutes 9/12, chest 3/12, lats 6/12, upper_back 9/12, side_delts 3/8, abs 6/8     |
| build_muscle | 6    | standard | 115  | 264     | 70       | 3       | 3 (0)           | 4 (3)      | 100–208%  | none                                                                                                            |
| recomp       | 4    | standard | 71   | 178     | 87       | 0       | 3 (0)           | 6 (0)      | 106–200%  | none                                                                                                            |
| recomp       | 3    | standard | 51   | 133     | 94       | 0       | 6 (0)           | 6 (0)      | 71–175%   | side_delts 5/7                                                                                                  |
| recomp       | 4    | long     | 111  | 240     | 81       | 3       | 6 (3)           | 7 (0)      | 100–400%  | none                                                                                                            |
| recomp       | 2    | short    | 20   | 59      | 85       | 0       | 3 (0)           | 3 (0)      | 27–82%    | quads 4.5/11, hamstrings 6/11, glutes 9/11, chest 3/11, lats 6/11, upper_back 9/11, side_delts 2/6, abs 4.5/6   |
| recomp       | 6    | standard | 115  | 265     | 80       | 5       | 3 (0)           | 3 (3)      | 108–280%  | none                                                                                                            |
| lose_fat     | 4    | standard | 89   | 174     | 78       | 18      | 0 (0)           | 0 (0)      | 119–214%  | none                                                                                                            |
| lose_fat     | 3    | standard | 68   | 132     | 87       | 24      | 0 (0)           | 0 (0)      | 107–217%  | none                                                                                                            |
| lose_fat     | 4    | long     | 135  | 239     | 71       | 24      | 0 (0)           | 0 (0)      | 146–444%  | none                                                                                                            |
| lose_fat     | 2    | short    | 29   | 59      | 79       | 31      | 0 (0)           | 0 (0)      | 50–105%   | quads 5.5/11, hamstrings 6.5/11, chest 6/11, lats 6/11, upper_back 10.5/11, side_delts 4/6                      |
| lose_fat     | 6    | standard | 141  | 268     | 77       | 18      | 0 (0)           | 0 (0)      | 136–320%  | none                                                                                                            |
| athletic     | 4    | standard | 71   | 174     | 90       | 0       | 6 (3)           | 4 (0)      | 90–169%   | side_delts 9/10                                                                                                 |
| athletic     | 3    | standard | 53   | 130     | 89       | 0       | 3 (3)           | 4 (0)      | 83–136%   | quads 13/14, hamstrings 12.5/14, chest 13/14, lats 12/14, side_delts 7.5/9                                      |
| athletic     | 4    | long     | 116  | 239     | 70       | 16      | 4 (3)           | 4 (0)      | 100–285%  | none                                                                                                            |
| athletic     | 2    | short    | 21   | 58      | 86       | 0       | 3 (3)           | 3 (0)      | 25–75%    | quads 6/12, hamstrings 4.5/12, glutes 9/12, chest 3/12, lats 6/12, upper_back 8.5/12, side_delts 2/8, abs 5.5/8 |
| athletic     | 6    | standard | 112  | 265     | 78       | 3       | 3 (3)           | 6 (6)      | 100–219%  | none                                                                                                            |

## At 4 days Standard, the other cases

Back squat Sets, then bench Sets, a week.

| Goal         | Full gym, novice | Full home gym, intermediate | Full home gym, novice |
| ------------ | ---------------- | --------------------------- | --------------------- |
| build_muscle | 6, 4             | 6, 6                        | 6, 4                  |
| recomp       | 3, 6             | 3, 6                        | 3, 6                  |
| lose_fat     | 0, 0             | 0, 1                        | 0, 0                  |
| athletic     | 6, 5             | 6, 3                        | 6, 4                  |

A week of build_muscle, intermediate, on a Full gym:

- Deadlift ×3, Renegade row ×3, Back squat ×3, Pull up ×3, Barbell bench press ×3, Dumbbell lateral raise ×1
- Deadlift ×3, Barbell overhead press ×3, Archer push up ×3, Dumbbell bulgarian split squat ×3, Renegade row ×3, Dumbbell lateral raise ×3
- Dumbbell bulgarian split squat ×3, Barbell bench press ×3, Chest supported dumbbell row ×3, Dumbbell reverse lunge ×3, Landmine press ×3, Barbell overhead press ×2
- Barbell romanian deadlift ×3, Landmine press ×3, Chest supported dumbbell row ×3, Dumbbell romanian deadlift ×3, Back squat ×3, Single arm dumbbell bench press ×2

## The recovery filter

Ticket #93. A logged Set adds fatigue to its Muscles as the Week Ledger credits them, in full at once and fading in a straight line to nothing. An Exercise is left out while any of its primary Muscles is over the limit, until nothing else helps the budget.

- **Numbers chosen: 48 hours and a limit of 4** (`FATIGUE_HOURS` and `FATIGUE_LIMIT` in `weekly-budget.ts`), the plan's own starting point. No tuning was needed: with them, no Goal and days per week falls under the 4-Set floor other than the three at 2 days Short accepted in #90, and `plan-outcomes.test.ts` passes.
- **It only acts on back-to-back days.** The simulation spreads 4 and more days from Monday a day apart, and 2 or 3 days at least 2 days apart, where fatigue is gone. One Workout of Standard rarely puts a Muscle over 4 a day later (it needs more than 8 credited Sets), so it mostly acts at 5 and 6 days and at Long.
- **It raises the floor where it acts.** Spreading a Muscle's Sets over more Workouts lifts the lowest Muscle at 6 days Standard from 11–14 to 16.5–17.5 credited Sets.
- **The cost is barbell work at 6 days and Long.** Which Exercises come back the day after a Muscle rests changes, so build_muscle at 6 days Standard falls from 6 to 3 Sets of back squat and 9 to 4 of bench, and athletic loses back squat at 6 days. Why each one went wasn't isolated. The outcomes pinned in `plan-outcomes.test.ts` still hold, and loaded work at 6 days Standard falls from 78–88% to 70–80%.

Weekly Budget at each Goal and days per week, in credited Sets: the six main Muscles, then side delts and abs.

| Goal         | 2 days | 3 days | 4 days | 5 days | 6 days |
| ------------ | ------ | ------ | ------ | ------ | ------ |
| build_muscle | 12, 8  | 14, 9  | 16, 10 | 18, 11 | 20, 13 |
| recomp       | 11, 6  | 12, 7  | 14, 8  | 16, 9  | 18, 10 |
| lose_fat     | 11, 6  | 12, 7  | 14, 8  | 16, 9  | 18, 10 |
| athletic     | 12, 8  | 14, 9  | 16, 10 | 18, 11 | 20, 13 |

The lowest credited Sets any budgeted Muscle got in a week, with how many of the 3 weeks' Workouts held a Muscle back in brackets. Full gym, intermediate.

| Goal         | Length   | 2 days  | 3 days  | 4 days   | 5 days    | 6 days    |
| ------------ | -------- | ------- | ------- | -------- | --------- | --------- |
| build_muscle | short    | 3 (0)   | 6 (0)   | 4.5 (0)  | 7.5 (0)   | 8 (0)     |
| build_muscle | standard | 4 (0)   | 7.5 (0) | 6.5 (0)  | 13 (9)    | 17 (12)   |
| build_muscle | long     | 6 (0)   | 9 (0)   | 12.5 (3) | 17.5 (12) | 20.5 (15) |
| recomp       | short    | 2 (0)   | 6 (0)   | 4.5 (0)  | 6 (0)     | 4.5 (0)   |
| recomp       | standard | 4 (0)   | 5 (0)   | 8.5 (0)  | 9 (0)     | 17.5 (12) |
| recomp       | long     | 5 (0)   | 9 (0)   | 10.5 (3) | 18 (9)    | 23.5 (15) |
| lose_fat     | short    | 4 (0)   | 4 (0)   | 4 (0)    | 9 (0)     | 10 (3)    |
| lose_fat     | standard | 4.5 (0) | 7.5 (0) | 9.5 (3)  | 13 (3)    | 17 (12)   |
| lose_fat     | long     | 6.5 (0) | 10 (0)  | 12.5 (9) | 21 (12)   | 24 (15)   |
| athletic     | short    | 3 (0)   | 4 (0)   | 4 (0)    | 8 (0)     | 8 (0)     |
| athletic     | standard | 4.5 (0) | 7.5 (0) | 10.5 (0) | 11.5 (6)  | 16.5 (15) |
| athletic     | long     | 6 (0)   | 9.5 (0) | 15.5 (9) | 20 (12)   | 23 (12)   |

Before the filter, for comparison:

| Goal         | Length   | 2 days | 3 days | 4 days | 5 days | 6 days |
| ------------ | -------- | ------ | ------ | ------ | ------ | ------ |
| build_muscle | short    | 3      | 6      | 4.5    | 7.5    | 8      |
| build_muscle | standard | 4      | 7.5    | 6.5    | 12     | 14     |
| build_muscle | long     | 6      | 9      | 14     | 14     | 16     |
| recomp       | short    | 2      | 6      | 4.5    | 6      | 4.5    |
| recomp       | standard | 4      | 5      | 8.5    | 9      | 11     |
| recomp       | long     | 5      | 9      | 10.5   | 14.5   | 17     |
| lose_fat     | short    | 4      | 4      | 4      | 9      | 10.5   |
| lose_fat     | standard | 4.5    | 7.5    | 9.5    | 11     | 14     |
| lose_fat     | long     | 6.5    | 10     | 12     | 19     | 17.5   |
| athletic     | short    | 3      | 4      | 4      | 8      | 8      |
| athletic     | standard | 4.5    | 7.5    | 10.5   | 11.5   | 13     |
| athletic     | long     | 6      | 9.5    | 13.5   | 14     | 16.5   |

## Athletic's weekly squat

Ticket #100. Athletic's week now includes one two-legged loaded squat: 3 Sets of `back-squat`, or `goblet-squat` where there's no barbell. It's a required pick like the one-sided leg Exercise: first in its Workout and never in the same Workout as the one-sided pick, which goes first. It waits while quads or glutes are over the fatigue limit, rather than coming back as a last resort. Once done, back squat competes on score as before. Only athletic's rows changed; every other Goal's are identical.

- **Why it was missing.** At 4 days Standard athletic's legs came from Bulgarian split squat, reverse lunge and step up. Each credits quads and glutes as back squat does, plus 0.5 hamstrings, which athletic budgets. Back squat's extra 0.5 lower back isn't budgeted, and its 180-second Sets fit a Standard Workout less easily than their 135. The barbell factor of 1.02 is too small to change that. It wasn't the Ballistic or one-sided picks pushing it out, as this doc first guessed.
- **What it gives.** Full gym, intermediate: 0 to 6 back squat Sets a week at 4 days Standard, 0 to 3 at 2 days Short and 6 days Standard. At 4 days Standard the other cases go from 0 to 6.
- **What it costs the rest of the week**, at 4 days Standard on a Full gym, intermediate: 8 fewer Sets (79 to 71), as back squat's Sets are longer, and the lowest Muscle falls from 103% to 90% of budget, side delts at 9/10. Loaded work rises from 82 to 90%. On a Full home gym the lowest Muscle falls to 75 to 85%, side delts at 7.5 to 8.5/10. At 3 days Standard quads fall just under budget (13/14).
- **At 2 days Short** side delts fall from 4 to 2 credited Sets, under the 4-Set floor, as one of the two Short Workouts now opens with 9 minutes of back squat. `plan-outcomes.test.ts` accepts 2 for athletic there, alongside the three limits accepted in #90.

The lowest credited Sets any budgeted Muscle got in a week, athletic, Full gym, intermediate, before and after:

| Length   | 2 days | 3 days | 4 days  | 5 days | 6 days   |
| -------- | ------ | ------ | ------- | ------ | -------- |
| short    | 3, 2   | 4      | 4, 5.5  | 8      | 8        |
| standard | 4.5    | 7.5    | 10.5, 9 | 11.5   | 16.5     |
| long     | 6      | 9.5    | 15.5    | 20     | 23, 22.5 |

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
- **Cable and band ties now fall to the longer Sets.** `band-lat-pulldown` still ties `lat-pulldown` on score, and the cable one wins at 105 seconds to 75.
- **Side delts at 65% on build_muscle:** a Lateral raise could go earlier, but that's a separate fill-order question.

## Open questions

- **Should a Workout stop at the budget?** Parked until a real week of training and the timing check. At 4 days Standard, a Muscle reaches up to 214% of budget for lose_fat, for which the research found no benefit from extra Sets. Letting a Workout end early once the week's budget is met would give shorter Workouts, but spec story 22 and Workout Length both read as "fill the time".
- **lose_fat is 18 to 31% bands on a Full gym.** The time tilt still favours them at their 75 seconds, as the research warned.
- **2 days Short** reaches only 25 to 50% of the budget on its worst Muscle. Three of the 60 combinations stay under the 4-Set floor, all at 2 days Short: build_muscle on chest (3), and recomp and athletic on side delts (2). That's accepted as a known limit (#90), and for athletic as the cost of its weekly back squat (#100). A selection that reaches the floor exists, but scoring the floor stage by credit per second took back squat to 0 for every Goal at 4 days Standard, and the plan can't favour short Sets for Short alone, as it's always built Long.

## Limits of this model

- Every Workout is done exactly as planned, with no skipped Sets or Manual Workouts, and Assessment Workouts aren't counted.
- Workouts fall on fixed days, and Working Levels don't change, as progression is M6.
- Each Workout is planned at the moment it's done, so the recovery filter judges each Set exactly 24, 48 or more hours later. On the phone the plan is rebuilt on the day's first visit, which can be sooner.
- The planner is deterministic, so the 3 averaged weeks are one repeating cycle, not 3 samples.
