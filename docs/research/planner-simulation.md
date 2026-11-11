# Simulation on the real planner

The rerun asked for by spec #77 and ticket #87. The percentages in `exercise-selection-by-goal.md` came from a throwaway greedy planner and assumed the hamstring tags were removed. These numbers come from `planWorkout()` and `daysWorkout()`, with the tags kept. Written 2026-11-04.

**Update, 2026-11-06:** tables rerun after ties stopped falling to library order, which could decide outcomes: reversing it took recomp's bench to 0. `plan-outcomes.test.ts` now pins the outcomes that matter.

**Update, 2026-11-09:** tables rerun with the recovery filter (#93). See [The recovery filter](#the-recovery-filter) for the numbers chosen and what changed.

**Update, 2026-11-09:** athletic rows rerun with its weekly back squat (#100). See [Athletic's weekly squat](#athletics-weekly-squat).

**Update, 2026-11-10:** athletic rerun with jumps on and off (#105). See [Jumps](#jumps).

**Update, 2026-11-11:** the first two tables and the build_muscle week rerun with the library's gaps filled and calves in the Weekly Budget (#101), on the planner as it now is, the 130% cap (#128) included. See [The library's gaps](#the-librarys-gaps). The sections after them are kept as they were written.

**Update, 2026-11-11:** rerun with progression (#138): the lifter reaches every target and the real rules move the Working Levels between Workouts. Nothing a gym plans changed. See [Progression](#progression), which adds each Muscle's credit from primary credit and in total.

To reproduce: `pnpm --filter @fit/engines simulate` (`packages/engines/scripts/simulate-plans.ts`) prints every table.

## Result

- **With progression (#138), Working Levels move and nothing a gym plans changes.** No Muscle plans over the 130% cap through primary credit on either gym, but 164 Muscle and combination pairs are over 160% in total, so the cap comes back for a decision, and Bodyweight only still plans over the cap. See [Progression](#progression).
- **Since #101, calves in the budget cost build_muscle its back squat**: 0 Sets at 4 days Standard on every gym, where the planner gave 3, as the one-sided squats credit calves and back squat doesn't. The bullets below are from before #101 and the 130% cap. See [The library's gaps](#the-librarys-gaps).

- **Back squat and barbell bench now show up on a Full gym for build_muscle and recomp, after adding a barbell factor of 1.02 to the score.** At 4 days Standard, build_muscle gets 6 Sets of each and recomp gets 3 of back squat and 6 of bench. Neither opens a Standard Workout at 4 days, and at 6 days they sometimes do.
- **lose_fat and athletic still get little.** At 4 days Standard, lose_fat gets none of either, as its time tilt outweighs 1.02. That's accepted as a known limit of spec #77. Athletic got no back squat at 4 days Standard, as the one-sided dumbbell squats outscore it. A weekly rule (#100) now gives it at least 3 Sets in every simulated combination, 6 at 4 days Standard, and bench stays at 3 to 6.
- **The cost is a smaller week.** Barbell Sets take 180 seconds, so build_muscle at 4 days Standard falls from 81 to 68 Sets in 175 minutes, and side delts fall to 65% of budget.
- **The tables alone couldn't do this.** See [Why the tables can't fix it](#why-the-tables-cant-fix-it).
- **Loaded work is healthy.** 78 to 94% of Sets are loaded on a Full gym at Standard, and 0 to 24% of all Sets are bands, because band Exercises count as external. On a Full home gym at 4 days, lose_fat is 78% loaded against the research's 63%.
- **Workouts fill their Length, so weeks run over budget.** At 4 days Standard on a Full gym, build_muscle gets up to 169% of a Muscle's budget. The research stopped at the budget: 49 Sets in 83 minutes for lose_fat on a Full home gym, where the real planner gives 80 Sets in 175 minutes. This follows the spec (story 22, "a Planned Workout anyway"), but the spec didn't weigh it. See [Open questions](#open-questions).

## Method

- Four weeks of Workouts, each done exactly as planned at the usual Length, spread from Monday. Each Workout is planned after the ones before it are logged, as the server does. Tables show the average of weeks 2 to 4, so last week's Exercises can carry on.
- Equipment: the built-in Full gym, and the Full home gym preset with a 20 kg bar, plates and dumbbells to 40 kg. Bodyweight only is in the library's gaps table too, for the table row (#101).
- Lifters, by Reference Strength in kg for squat, hinge, push, pull, core: intermediate 100, 120, 80, 80, 60 at 80 kg; novice 50, 60, 40, 40, 30 at 75 kg. No injuries. Working Levels start from these, as the Assessment seeds them, and since #138 move after every Workout by the progression rules, the lifter reaching every target.
- **Loaded %** is Sets of Exercises with external load, **Bands %** the part of all Sets that are band Exercises, and **Of budget** the lowest and highest Muscle's credited Sets against its budget. A number in brackets is how many Workouts across the 3 weeks opened with that Exercise.

## Full gym, intermediate

| Goal         | Days | Length   | Sets | Minutes | Loaded % | Bands % | Back squat Sets | Bench Sets | Of budget | Short of budget                                                                                                  |
| ------------ | ---- | -------- | ---- | ------- | -------- | ------- | --------------- | ---------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| build_muscle | 4    | standard | 87   | 176     | 77       | 0       | 0 (0)           | 6 (0)      | 113–150%  | none                                                                                                             |
| build_muscle | 3    | standard | 65   | 132     | 78       | 0       | 0 (0)           | 5 (0)      | 89–139%   | side_delts 8/9, calves 4.5/5                                                                                     |
| build_muscle | 4    | long     | 116  | 238     | 71       | 6       | 0 (0)           | 3 (0)      | 83–265%   | calves 5/6                                                                                                       |
| build_muscle | 2    | short    | 26   | 57      | 77       | 0       | 0 (0)           | 3 (0)      | 25–100%   | quads 7.5/12, hamstrings 7.5/12, chest 3/12, lats 6/12, upper_back 9/12, side_delts 3.5/8, abs 6/8, calves 4.5/5 |
| build_muscle | 6    | standard | 139  | 267     | 74       | 4       | 0 (0)           | 6 (3)      | 113–227%  | none                                                                                                             |
| recomp       | 4    | standard | 87   | 175     | 79       | 3       | 3 (0)           | 6 (0)      | 121–206%  | none                                                                                                             |
| recomp       | 3    | standard | 72   | 134     | 82       | 8       | 3 (0)           | 6 (0)      | 104–200%  | none                                                                                                             |
| recomp       | 4    | long     | 109  | 238     | 86       | 10      | 6 (3)           | 7 (0)      | 121–263%  | none                                                                                                             |
| recomp       | 2    | short    | 24   | 58      | 88       | 0       | 3 (0)           | 3 (0)      | 41–82%    | quads 4.5/11, hamstrings 6/11, glutes 9/11, chest 6/11, lats 6/11, upper_back 9/11, side_delts 3/6, abs 4.5/6    |
| recomp       | 6    | standard | 131  | 266     | 76       | 5       | 3 (0)           | 9 (3)      | 122–275%  | none                                                                                                             |
| lose_fat     | 4    | standard | 106  | 178     | 82       | 20      | 0 (0)           | 0 (0)      | 121–238%  | none                                                                                                             |
| lose_fat     | 3    | standard | 83   | 133     | 80       | 22      | 0 (0)           | 0 (0)      | 104–229%  | none                                                                                                             |
| lose_fat     | 4    | long     | 130  | 238     | 78       | 22      | 0 (0)           | 0 (0)      | 89–381%   | quads 12.5/14                                                                                                    |
| lose_fat     | 2    | short    | 31   | 58      | 81       | 19      | 0 (0)           | 0 (0)      | 55–123%   | quads 7.5/11, hamstrings 7.5/11, chest 6/11, lats 7/11, upper_back 10/11, side_delts 4.5/6                       |
| lose_fat     | 6    | standard | 148  | 268     | 73       | 17      | 0 (0)           | 0 (0)      | 117–335%  | none                                                                                                             |
| athletic     | 4    | standard | 87   | 178     | 80       | 0       | 3 (3)           | 5 (0)      | 83–156%   | calves 5/6                                                                                                       |
| athletic     | 3    | standard | 61   | 132     | 84       | 0       | 3 (3)           | 5 (0)      | 83–129%   | quads 13/14, hamstrings 12.5/14, side_delts 7.5/9                                                                |
| athletic     | 4    | long     | 118  | 237     | 74       | 6       | 3 (3)           | 6 (0)      | 88–270%   | quads 14/16, calves 5.5/6                                                                                        |
| athletic     | 2    | short    | 23   | 59      | 87       | 0       | 3 (3)           | 2 (0)      | 17–100%   | quads 6/12, hamstrings 7.5/12, chest 2/12, lats 6/12, upper_back 9/12, side_delts 1.5/8, abs 6/8, calves 3/5     |
| athletic     | 6    | standard | 136  | 266     | 76       | 4       | 3 (0)           | 3 (3)      | 94–242%   | quads 19.5/20, calves 7.5/8                                                                                      |

## At 4 days Standard, the other cases

Back squat Sets, then bench Sets, a week.

| Goal         | Full gym, novice | Full home gym, intermediate | Full home gym, novice |
| ------------ | ---------------- | --------------------------- | --------------------- |
| build_muscle | 0, 6             | 0, 6                        | 0, 6                  |
| recomp       | 3, 6             | 3, 6                        | 3, 6                  |
| lose_fat     | 0, 0             | 0, 4                        | 0, 4                  |
| athletic     | 3, 5             | 3, 5                        | 3, 5                  |

A week of build_muscle, intermediate, on a Full gym:

- Deadlift ×3, Dumbbell lateral raise ×3, Dumbbell step up ×3, Renegade row ×3, Pull up ×3, Barbell bench press ×3, Archer push up ×3
- Dumbbell step up ×3, Dumbbell single leg romanian deadlift ×3, Barbell overhead press ×3, Pull up ×3, Renegade row ×3, Barbell bench press ×3, Dumbbell lateral raise ×3
- Deadlift ×3, Dumbbell bulgarian split squat ×3, Landmine press ×3, Archer push up ×3, Chest supported dumbbell row ×3, Cable knee extension ×3, Nordic hamstring curl ×1
- Barbell overhead press ×3, Nordic hamstring curl ×4, Landmine press ×4, Dumbbell overhead press ×3, Lat pulldown ×3, Cable knee extension ×3, Calf raise ×3, Side plank ×3

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

Ticket #100. Athletic's week now includes one two-legged loaded squat: 3 Sets of `back-squat`, or `goblet-squat` where there's no barbell. It's a required pick like the one-sided leg Exercise: first in its Workout and never in the same Workout as the one-sided pick, which goes first. It waits while quads or glutes are over the fatigue limit, rather than coming back as a last resort. The week counts as done once it has had 3 Sets of the squat the equipment calls for, so goblet squat doesn't stand in for back squat on a barbell setup; making that so moved none of the tables. Once done, back squat competes on score as before. Only athletic's rows changed; every other Goal's are identical.

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

## Jumps

Ticket #105. With the "Include jumps" switch on, an athletic user whose squat was tested gets 2 jumps of 3 Sets first in 2 Workouts a week: one that goes up and one that goes forward or sideways, the second Workout's two different from the first's. A jump Set is 75 seconds and credits 0.5 to quads and glutes only. Rerun 2026-11-10, athletic, Full gym, intermediate, switch off then on. The off rows are today's planner, so they differ a little from the tables above, which weren't all rerun after later tickets.

| Days | Length   | Jumps | Sets | Minutes | Jump Sets | Jump minutes | Other Sets | Quads, glutes | Of budget | Short of budget                                                                                               |
| ---- | -------- | ----- | ---- | ------- | --------- | ------------ | ---------- | ------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| 4    | standard | off   | 77   | 175     | 0         | 0            | 77         | 18, 27        | 103–169%  | none                                                                                                          |
| 4    | standard | on    | 87   | 177     | 12        | 15           | 75         | 16.5, 29      | 100–181%  | none                                                                                                          |
| 3    | standard | off   | 58   | 130     | 0         | 0            | 58         | 15, 21        | 83–150%   | hamstrings 13.5/14, chest 13/14, side_delts 7.5/9                                                             |
| 3    | standard | on    | 64   | 135     | 12        | 15           | 52         | 13.5, 21      | 75–150%   | quads 13.5/14, hamstrings 10.5/14, lats 12.5/14, side_delts 7/9                                               |
| 4    | long     | off   | 116  | 239     | 0         | 0            | 116        | 16, 33        | 100–285%  | none                                                                                                          |
| 4    | long     | on    | 115  | 239     | 12        | 15           | 103        | 18.5, 35      | 100–230%  | none                                                                                                          |
| 2    | short    | off   | 24   | 58      | 0         | 0            | 24         | 6, 9          | 33–75%    | quads 6/12, hamstrings 4.5/12, glutes 9/12, chest 4/12, lats 6/12, upper_back 8.5/12, side_delts 4/8, abs 6/8 |
| 2    | short    | on    | 27   | 58      | 12        | 15           | 15         | 12, 15        | 0–125%    | hamstrings 4.5/12, chest 1/12, lats 5/12, upper_back 6.5/12, side_delts 0/8, abs 4.5/8                        |
| 6    | standard | off   | 131  | 266     | 0         | 0            | 131        | 20, 36        | 100–277%  | none                                                                                                          |
| 6    | standard | on    | 137  | 265     | 12        | 15           | 125        | 22.5, 38.5    | 105–231%  | none                                                                                                          |

- **Jumps take 15 minutes a week** in every combination, 12 Sets of 75 seconds, as the research estimated. They're 90 contacts a week: 48 in the first jump Workout and 42 in the second. The Day's Workout estimate includes them, so a Workout still fits its Length; the delivery figures in `exercise-selection-by-goal.md` don't include them yet.
- **The cost is the strength work those 15 minutes would have held**, as Workouts fill their Length. At 4 days Standard it's 2 Sets of other work (77 to 75) and nothing falls short. At 4 days Long and 6 days Standard it's 6 to 13 Sets of work already over budget. At 3 days Standard it's 6 Sets, and quads, hamstrings and lats fall just under budget.
- **2 days Short can't afford them.** Jumps go first and are the last thing a shorter Length cuts, so they take 15 of the week's 58 minutes: other Sets fall from 24 to 15, chest to 1 and side delts to 0. That's what the spec asked for, as the switch is the user's choice, but a user training 2 Short days a week loses most of their upper-body work to it. Worth a decision before the switch is shown to such a user.
- **Quads and glutes barely move**, by -1.5 to +6 credited Sets, as a jump Set's 0.5 credit stands in for the leg work it displaces. Jumps add to strength work rather than replace it.

## The library's gaps

Ticket #101, from `exercise-selection-by-goal.md`, "Q6. Library gaps by Goal". Six Exercises join the library, each with a strength ratio and ladder links:

- **Calf raise** (`calf-raise`): dumbbells or kettlebells, calves primary, squat Pattern at 0.5.
- **Nordic hamstring curl** (`nordic-hamstring-curl`): bodyweight, hamstrings primary, its feet held by a loaded barbell or a low bar in a power rack. The suspension hamstring curl progresses to it.
- **Dumbbell curl** (`dumbbell-curl`) and **dumbbell overhead triceps extension** (`dumbbell-overhead-triceps-extension`): pull and push at 0.5, biceps and triceps still unbudgeted.
- **Cable knee extension** (`cable-knee-extension`): one leg at a time on a cable machine's low pulley, quads primary.
- **Table row** (`table-row`): bodyweight, lats and upper back primary, the easier rung below the inverted row. It needs no equipment tag, like the incline push-up's counter, so that Bodyweight only gets lats work; the inverted row keeps its `table` option.

Calves join the Weekly Budget for athletic and build_muscle at min 4, target 6, scaled by days per week like the others (5, 5, 6, 7, 8 for 2 to 6 days), and fill with side delts and abs, last.

Sets a week of each, and calves' credited Sets, intermediate:

| Profile         | Goal         | Days | Length   | calf-raise | nordic-hamstring-curl | dumbbell-curl | dumbbell-overhead-triceps-extension | cable-knee-extension | table-row | Calves |
| --------------- | ------------ | ---- | -------- | ---------- | --------------------- | ------------- | ----------------------------------- | -------------------- | --------- | ------ |
| Full gym        | build_muscle | 4    | standard | 3          | 5                     | 0             | 0                                   | 6                    | 0         | 7.5    |
| Full gym        | build_muscle | 4    | long     | 0          | 7                     | 0             | 0                                   | 7                    | 0         | 5      |
| Full gym        | build_muscle | 6    | standard | 3          | 11                    | 0             | 0                                   | 10                   | 0         | 9      |
| Full gym        | recomp       | 4    | standard | 0          | 5                     | 0             | 0                                   | 6                    | 0         | 0      |
| Full gym        | recomp       | 4    | long     | 0          | 8                     | 0             | 0                                   | 4                    | 0         | 0      |
| Full gym        | recomp       | 6    | standard | 0          | 11                    | 0             | 0                                   | 11                   | 0         | 0      |
| Full gym        | lose_fat     | 4    | standard | 0          | 4                     | 0             | 0                                   | 7                    | 0         | 0      |
| Full gym        | lose_fat     | 4    | long     | 0          | 6                     | 0             | 0                                   | 8                    | 0         | 0      |
| Full gym        | lose_fat     | 6    | standard | 0          | 9                     | 0             | 0                                   | 10                   | 0         | 1.5    |
| Full gym        | athletic     | 4    | standard | 0          | 4                     | 0             | 0                                   | 7                    | 0         | 5      |
| Full gym        | athletic     | 4    | long     | 0          | 7                     | 0             | 0                                   | 7                    | 0         | 5.5    |
| Full gym        | athletic     | 6    | standard | 3          | 9                     | 0             | 0                                   | 9                    | 0         | 7.5    |
| Full home gym   | build_muscle | 4    | standard | 3          | 5                     | 0             | 0                                   | 0                    | 0         | 7.5    |
| Full home gym   | build_muscle | 4    | long     | 0          | 7                     | 0             | 0                                   | 0                    | 0         | 5      |
| Full home gym   | build_muscle | 6    | standard | 4          | 12                    | 0             | 0                                   | 0                    | 0         | 8.5    |
| Full home gym   | recomp       | 4    | standard | 0          | 6                     | 0             | 0                                   | 0                    | 0         | 0      |
| Full home gym   | recomp       | 4    | long     | 0          | 8                     | 0             | 0                                   | 0                    | 0         | 0      |
| Full home gym   | recomp       | 6    | standard | 0          | 11                    | 0             | 0                                   | 0                    | 0         | 0      |
| Full home gym   | lose_fat     | 4    | standard | 0          | 8                     | 0             | 0                                   | 0                    | 0         | 0      |
| Full home gym   | lose_fat     | 4    | long     | 0          | 8                     | 0             | 0                                   | 0                    | 0         | 1.5    |
| Full home gym   | lose_fat     | 6    | standard | 0          | 11                    | 0             | 0                                   | 0                    | 0         | 1.5    |
| Full home gym   | athletic     | 4    | standard | 0          | 4                     | 0             | 0                                   | 0                    | 0         | 5      |
| Full home gym   | athletic     | 4    | long     | 3          | 8                     | 0             | 0                                   | 0                    | 0         | 7      |
| Full home gym   | athletic     | 6    | standard | 4          | 12                    | 0             | 0                                   | 0                    | 0         | 8.5    |
| Bodyweight only | build_muscle | 4    | standard | 0          | 0                     | 0             | 0                                   | 0                    | 8         | 10     |
| Bodyweight only | build_muscle | 4    | long     | 0          | 0                     | 0             | 0                                   | 0                    | 8         | 10     |
| Bodyweight only | build_muscle | 6    | standard | 0          | 0                     | 0             | 0                                   | 0                    | 12        | 13.5   |
| Bodyweight only | recomp       | 4    | standard | 0          | 0                     | 0             | 0                                   | 0                    | 8         | 10     |
| Bodyweight only | recomp       | 4    | long     | 0          | 0                     | 0             | 0                                   | 0                    | 8         | 10     |
| Bodyweight only | recomp       | 6    | standard | 0          | 0                     | 0             | 0                                   | 0                    | 11        | 13.8   |
| Bodyweight only | lose_fat     | 4    | standard | 0          | 0                     | 0             | 0                                   | 0                    | 8         | 10     |
| Bodyweight only | lose_fat     | 4    | long     | 0          | 0                     | 0             | 0                                   | 0                    | 8         | 8.5    |
| Bodyweight only | lose_fat     | 6    | standard | 0          | 0                     | 0             | 0                                   | 0                    | 11        | 12     |
| Bodyweight only | athletic     | 4    | standard | 0          | 0                     | 0             | 0                                   | 0                    | 8         | 10     |
| Bodyweight only | athletic     | 4    | long     | 0          | 0                     | 0             | 0                                   | 0                    | 8         | 10     |
| Bodyweight only | athletic     | 6    | standard | 0          | 0                     | 0             | 0                                   | 0                    | 12        | 13.5   |

- **Calves reach their min of 4 everywhere but 2 days Short** for athletic and build_muscle (`plan-outcomes.test.ts`, either library order), mostly from the 0.5 credit of step-ups, split squats and lunges. The calf raise itself comes in for build_muscle at 4 days Standard (3 Sets) and at 6 days. Athletic at 4 days Standard gets 5 of 6, and at 2 days Short 3 of 5.
- **The table row gives Bodyweight only lats work**: 8 Sets a week at 4 days, 12 at 6, the variety cap's limit for the only lats Exercise there. Lats rise from 0 to 8 of 14 to 16.
- **The Nordic curl and the knee extension fill the legs the cap left short.** Before #101, with the cap, quads and hamstrings fell short at 4 days Standard on every gym (12 of 16 for build_muscle on a Full gym). The Nordic curl shows up for every Goal, athletic included, at 4 to 12 Sets a week, and the knee extension wherever there's a cable machine; on a Full gym nothing is short now but athletic's calves. Sets at 4 days Standard rise from 82 to 87 for build_muscle.
- **The curl and the triceps extension never show up.** Biceps and triceps aren't budgeted, as the ticket decided, and the planner only picks an Exercise that credits a budgeted Muscle still short. They're in the library for Manual Workouts. Planning them needs a budget or a rule, which is a decision for later.
- **Bodyweight only's thin Alternative Exercises**: Exercises with no bodyweight Alternative Exercise sharing a Pattern and a primary Muscle went from 9 to 7. The table row matches chin-up, lat pulldown and band lat pulldown, and gives prone Y-T-W a second match; the calf raise and the curl add two with none. Now: farmers-carry, dumbbell-lateral-raise, side-plank, front-rack-carry, overhead-carry, calf-raise, dumbbell-curl.

What calves cost. Back squat and bench Sets a week at 4 days Standard, the same planner without #101, then with it:

| Goal         | Full gym, intermediate | Full gym, novice | Full home gym, intermediate | Full home gym, novice |
| ------------ | ---------------------- | ---------------- | --------------------------- | --------------------- |
| build_muscle | 3, 4 → 0, 6            | 3, 4 → 0, 6      | 3, 4 → 0, 6                 | 3, 4 → 0, 6           |
| recomp       | 3, 6 → 3, 6            | 3, 6 → 3, 6      | 3, 6 → 3, 6                 | 3, 6 → 3, 6           |
| athletic     | 3, 5 → 3, 5            | 3, 5 → 3, 5      | 3, 6 → 3, 5                 | 3, 6 → 3, 5           |

- **build_muscle loses its back squat**, 3 Sets to 0 on every gym; athletic keeps its weekly 3 by rule. Step-ups, split squats and lunges credit calves 0.5 and back squat doesn't, so once calves are budgeted they outscore it, and the cap leaves room for only one squat pick. The same library without calves in the budget keeps back squat at 3. recomp and lose_fat, which don't budget calves, don't change. `plan-outcomes.test.ts` marks build_muscle at 4 and 6 days Standard as a known loss (`it.fails`, so it fails once back squat is back), and accepts athletic's 2 days Short at 1.5 on side delts (was 2).

## Progression

Ticket #138, closing spec #119's simulation check. The simulated lifter now gets stronger: every Set reaches the target the plan gives, and after each Workout the real rules (`progressWorkingLevel`, ADR 0007) move the Working Levels of its Exercises from the stored level, or else the one the Assessment seeds, as the server does at upload. The next plan prescribes the moved levels. The Assessment's B is on the first simulated Monday, so the four weeks are the Block's first four and none is the deload week. `plan-outcomes.test.ts` pins that every weighted Exercise with a rep range ends the four weeks heavier, or at the same load for more reps, for every Goal at 4 days Standard on a Full gym, and that at least one load goes up a Load Step.

- **Nothing a gym plans changes.** Every table above for Full gym and Full home gym came out the same with progression on: the planner picks Exercises by credit and time, not load, and four weeks are too few for an Exercise to be outgrown and swapped for its harder variant. Bodyweight only's calves for recomp at 6 days Standard moved from 13.5 to 13.8 (in the table above).
- **Loads and reps move as the rules say.** A barbell lift does 6 reps up to 10, then one Load Step up at the reps Epley predicts there: deadlift 92.5 kg × 6 to 95 kg × 10 over 8 Workouts. A dumbbell Exercise whose next Load Step Epley says is out of reach climbs past 12 towards 20 (lateral raise 5 kg × 8 to 5 kg × 15). Bands step up a band at 15 reps, a timed hold climbs 5 seconds a Workout to 60, a weighted Ballistic Exercise goes up a Load Step every 3rd Workout with no RPE logged (kettlebell swing 24 to 28 kg), and carries hold their load. Bodyweight Exercises seeded at 15 reps (archer push-up, pike push-up) are outgrown and stay at 15 where their harder variant isn't planned.
- **No Muscle plans over the 130% cap through primary credit** on either gym, for either lifter, in any of the combinations below, and `plan-outcomes.test.ts` keeps pinning it with progression on. Primary credit reaches 130% at most.
- **Total credit is over 160% on 164 Muscle and combination pairs**, the same 164 as before progression: abs (52), upper back (49), side delts (46) and glutes (17), all mostly from secondary credit. The highest is lose_fat abs at 4 days Long, 381 to 400%. Spec #119 says that brings the cap back for a decision.
- **Bodyweight only plans over the cap through primary credit**, as it did before progression (#101 left it out of the cap test). Its few Exercises can't fill a Workout without going over, so the cap gives way. Progression makes recomp and lose_fat slightly worse at 6 days Long (glutes 82 to 85 of 18 for recomp, novice, from week 3), as an outgrown Exercise such as the incline push-up gives way to its harder variant and the week fills with more glute bridges.
- **build_muscle still loses its back squat**: 0 Sets a week at 4 and 6 days Standard on a Full gym, as before. Dumbbell step-ups (6) and Bulgarian split squats (3) take the squat picks.

A lifter who reaches every target, build_muscle:

| Exercise                              | Workouts | First target | Last target  |
| ------------------------------------- | -------- | ------------ | ------------ |
| deadlift                              | 8        | 92.5 kg × 6  | 95 kg × 10   |
| dumbbell-lateral-raise                | 8        | 5 kg × 8     | 5 kg × 15    |
| dumbbell-step-up                      | 8        | 12.5 kg × 8  | 12.5 kg × 15 |
| renegade-row                          | 8        | 8 kg × 8     | 8 kg × 15    |
| pull-up                               | 8        | 3 reps       | 10 reps      |
| barbell-bench-press                   | 8        | 62.5 kg × 6  | 65 kg × 10   |
| archer-push-up                        | 8        | 15 reps      | 15 reps      |
| dumbbell-single-leg-romanian-deadlift | 4        | 17.5 kg × 8  | 17.5 kg × 11 |
| barbell-overhead-press                | 8        | 40 kg × 6    | 42.5 kg × 9  |
| dumbbell-bulgarian-split-squat        | 4        | 15 kg × 8    | 15 kg × 11   |
| landmine-press                        | 8        | 20 kg × 6    | 22.5 kg × 7  |
| chest-supported-dumbbell-row          | 4        | 12.5 kg × 8  | 12.5 kg × 11 |
| cable-knee-extension                  | 8        | 15 kg × 8    | 15 kg × 15   |
| nordic-hamstring-curl                 | 8        | 6 reps       | 13 reps      |
| dumbbell-overhead-press               | 4        | 15 kg × 8    | 15 kg × 11   |
| lat-pulldown                          | 4        | 45 kg × 8    | 45 kg × 11   |
| calf-raise                            | 4        | 22.5 kg × 8  | 22.5 kg × 11 |
| side-plank                            | 4        | 30 s         | 45 s         |

The other Goals' tables are printed by the script. Each Muscle's credited Sets against its Weekly Budget in the heaviest of weeks 2 to 4, from primary credit alone, then in total:

### Credit against the budget: Full gym, intermediate

| Goal         | Days | Length   | quads     | hamstrings | glutes    | chest     | lats      | upper_back | side_delts | abs      | calves   |
| ------------ | ---- | -------- | --------- | ---------- | --------- | --------- | --------- | ---------- | ---------- | -------- | -------- |
| build_muscle | 4    | standard | 94 / 113  | 88 / 116   | 113 / 138 | 119 / 119 | 113 / 113 | 94 / 150   | 60 / 120   | 0 / 150  | 50 / 125 |
| build_muscle | 3    | standard | 86 / 107  | 86 / 118   | 129 / 139 | 114 / 114 | 107 / 107 | 86 / 132   | 67 / 89    | 0 / 117  | 0 / 90   |
| build_muscle | 4    | long     | 88 / 109  | 106 / 128  | 106 / 150 | 125 / 125 | 125 / 125 | 63 / 213   | 70 / 200   | 0 / 265  | 0 / 83   |
| build_muscle | 2    | short    | 50 / 63   | 50 / 63    | 100 / 100 | 25 / 25   | 50 / 50   | 50 / 75    | 25 / 44    | 0 / 75   | 0 / 90   |
| build_muscle | 6    | standard | 110 / 125 | 100 / 123  | 105 / 153 | 130 / 130 | 125 / 125 | 75 / 175   | 54 / 154   | 0 / 227  | 38 / 113 |
| recomp       | 4    | standard | 107 / 129 | 100 / 121  | 129 / 161 | 129 / 129 | 129 / 129 | 64 / 168   | 88 / 169   | 0 / 206  | –        |
| recomp       | 3    | standard | 100 / 125 | 83 / 104   | 117 / 146 | 125 / 125 | 125 / 125 | 75 / 167   | 100 / 171  | 43 / 200 | –        |
| recomp       | 4    | long     | 93 / 121  | 114 / 125  | 121 / 164 | 129 / 129 | 129 / 129 | 64 / 229   | 88 / 250   | 38 / 263 | –        |
| recomp       | 2    | short    | 27 / 41   | 55 / 55    | 82 / 82   | 55 / 55   | 55 / 55   | 55 / 82    | 50 / 50    | 0 / 75   | –        |
| recomp       | 6    | standard | 111 / 128 | 111 / 128  | 100 / 164 | 122 / 122 | 122 / 122 | 50 / 183   | 50 / 205   | 0 / 275  | –        |
| lose_fat     | 4    | standard | 100 / 125 | 107 / 121  | 129 / 171 | 129 / 129 | 129 / 129 | 50 / 204   | 100 / 213  | 38 / 238 | –        |
| lose_fat     | 3    | standard | 92 / 104  | 125 / 125  | 108 / 150 | 125 / 125 | 125 / 125 | 75 / 204   | 100 / 207  | 0 / 229  | –        |
| lose_fat     | 4    | long     | 79 / 89   | 107 / 129  | 107 / 157 | 129 / 129 | 129 / 129 | 50 / 268   | 50 / 306   | 0 / 381  | –        |
| lose_fat     | 2    | short    | 55 / 68   | 55 / 68    | 109 / 123 | 55 / 55   | 64 / 64   | 64 / 91    | 50 / 75    | 0 / 100  | –        |
| lose_fat     | 6    | standard | 106 / 122 | 100 / 117  | 100 / 156 | 128 / 128 | 111 / 119 | 67 / 222   | 70 / 260   | 30 / 335 | –        |
| athletic     | 4    | standard | 106 / 116 | 81 / 103   | 119 / 144 | 113 / 113 | 125 / 125 | 94 / 156   | 60 / 125   | 0 / 155  | 0 / 83   |
| athletic     | 3    | standard | 93 / 93   | 64 / 89    | 114 / 125 | 107 / 107 | 107 / 107 | 107 / 129  | 67 / 83    | 0 / 106  | 0 / 100  |
| athletic     | 4    | long     | 88 / 88   | 113 / 125  | 113 / 147 | 125 / 125 | 119 / 128 | 94 / 222   | 70 / 185   | 30 / 270 | 0 / 92   |
| athletic     | 2    | short    | 50 / 50   | 50 / 63    | 100 / 100 | 17 / 17   | 50 / 50   | 50 / 75    | 0 / 19     | 0 / 75   | 0 / 60   |
| athletic     | 6    | standard | 90 / 98   | 105 / 120  | 105 / 145 | 130 / 130 | 125 / 125 | 75 / 198   | 46 / 154   | 0 / 242  | 38 / 94  |

### Credit against the budget: Full gym, novice

| Goal         | Days | Length   | quads     | hamstrings | glutes    | chest     | lats      | upper_back | side_delts | abs      | calves   |
| ------------ | ---- | -------- | --------- | ---------- | --------- | --------- | --------- | ---------- | ---------- | -------- | -------- |
| build_muscle | 4    | standard | 100 / 119 | 81 / 109   | 113 / 138 | 119 / 119 | 125 / 125 | 94 / 159   | 60 / 125   | 0 / 160  | 0 / 100  |
| build_muscle | 3    | standard | 86 / 107  | 79 / 111   | 129 / 136 | 100 / 100 | 114 / 114 | 93 / 136   | 67 / 83    | 0 / 106  | 0 / 120  |
| build_muscle | 4    | long     | 88 / 109  | 106 / 128  | 106 / 141 | 125 / 125 | 125 / 125 | 63 / 213   | 80 / 195   | 0 / 255  | 0 / 83   |
| build_muscle | 2    | short    | 50 / 63   | 50 / 63    | 100 / 100 | 25 / 25   | 50 / 50   | 50 / 75    | 25 / 44    | 0 / 75   | 0 / 90   |
| build_muscle | 6    | standard | 110 / 125 | 90 / 113   | 90 / 148  | 120 / 120 | 120 / 120 | 75 / 180   | 62 / 162   | 0 / 235  | 38 / 94  |
| recomp       | 4    | standard | 107 / 129 | 100 / 121  | 129 / 161 | 114 / 114 | 129 / 129 | 64 / 168   | 88 / 169   | 0 / 188  | –        |
| recomp       | 3    | standard | 100 / 125 | 83 / 104   | 117 / 146 | 125 / 125 | 125 / 125 | 75 / 167   | 100 / 171  | 43 / 200 | –        |
| recomp       | 4    | long     | 93 / 121  | 114 / 125  | 121 / 175 | 129 / 129 | 129 / 129 | 64 / 229   | 100 / 256  | 38 / 275 | –        |
| recomp       | 2    | short    | 27 / 41   | 55 / 55    | 82 / 82   | 55 / 55   | 55 / 55   | 55 / 82    | 50 / 50    | 0 / 100  | –        |
| recomp       | 6    | standard | 106 / 122 | 106 / 128  | 111 / 158 | 128 / 128 | 128 / 128 | 50 / 200   | 90 / 240   | 0 / 275  | –        |
| lose_fat     | 4    | standard | 100 / 125 | 107 / 121  | 129 / 171 | 129 / 129 | 129 / 129 | 50 / 204   | 100 / 213  | 38 / 238 | –        |
| lose_fat     | 3    | standard | 92 / 104  | 100 / 113  | 108 / 138 | 125 / 125 | 125 / 125 | 75 / 196   | 100 / 214  | 0 / 229  | –        |
| lose_fat     | 4    | long     | 93 / 104  | 107 / 129  | 107 / 157 | 129 / 129 | 100 / 114 | 50 / 254   | 50 / 306   | 50 / 394 | –        |
| lose_fat     | 2    | short    | 55 / 68   | 55 / 68    | 109 / 109 | 64 / 64   | 82 / 82   | 55 / 109   | 50 / 75    | 0 / 100  | –        |
| lose_fat     | 6    | standard | 83 / 100  | 106 / 114  | 100 / 150 | 128 / 128 | 117 / 125 | 50 / 242   | 70 / 300   | 30 / 375 | –        |
| athletic     | 4    | standard | 106 / 116 | 81 / 103   | 119 / 141 | 113 / 113 | 119 / 119 | 94 / 153   | 60 / 120   | 0 / 150  | 0 / 83   |
| athletic     | 3    | standard | 100 / 100 | 71 / 96    | 114 / 129 | 107 / 107 | 107 / 107 | 86 / 121   | 67 / 89    | 0 / 111  | 0 / 100  |
| athletic     | 4    | long     | 88 / 88   | 113 / 125  | 113 / 147 | 125 / 125 | 119 / 128 | 94 / 222   | 70 / 185   | 30 / 275 | 0 / 92   |
| athletic     | 2    | short    | 75 / 75   | 25 / 50    | 100 / 100 | 25 / 25   | 50 / 50   | 50 / 75    | 0 / 19     | 0 / 75   | 0 / 60   |
| athletic     | 6    | standard | 100 / 108 | 100 / 115  | 90 / 148  | 120 / 120 | 130 / 130 | 60 / 180   | 69 / 173   | 0 / 231  | 75 / 113 |

### Credit against the budget: Full home gym, intermediate

| Goal         | Days | Length   | quads    | hamstrings | glutes    | chest     | lats      | upper_back | side_delts | abs      | calves   |
| ------------ | ---- | -------- | -------- | ---------- | --------- | --------- | --------- | ---------- | ---------- | -------- | -------- |
| build_muscle | 4    | standard | 75 / 84  | 69 / 106   | 113 / 141 | 119 / 119 | 125 / 125 | 94 / 156   | 60 / 125   | 0 / 170  | 50 / 125 |
| build_muscle | 3    | standard | 64 / 86  | 86 / 118   | 129 / 139 | 100 / 100 | 114 / 114 | 93 / 146   | 67 / 100   | 0 / 122  | 0 / 90   |
| build_muscle | 4    | long     | 63 / 75  | 88 / 119   | 106 / 153 | 125 / 125 | 119 / 119 | 81 / 200   | 80 / 215   | 0 / 265  | 0 / 83   |
| build_muscle | 2    | short    | 50 / 63  | 50 / 63    | 100 / 100 | 25 / 25   | 50 / 50   | 50 / 75    | 25 / 44    | 0 / 75   | 0 / 90   |
| build_muscle | 6    | standard | 60 / 75  | 90 / 113   | 90 / 140  | 130 / 130 | 110 / 118 | 75 / 168   | 62 / 165   | 23 / 238 | 50 / 106 |
| recomp       | 4    | standard | 64 / 86  | 107 / 129  | 129 / 164 | 121 / 121 | 107 / 107 | 64 / 171   | 88 / 188   | 0 / 200  | –        |
| recomp       | 3    | standard | 75 / 100 | 83 / 108   | 125 / 158 | 125 / 125 | 100 / 100 | 50 / 138   | 86 / 179   | 0 / 186  | –        |
| recomp       | 4    | long     | 64 / 93  | 114 / 125  | 121 / 179 | 121 / 121 | 100 / 100 | 43 / 196   | 100 / 269  | 0 / 319  | –        |
| recomp       | 2    | short    | 27 / 41  | 55 / 55    | 82 / 82   | 45 / 45   | 55 / 55   | 55 / 95    | 50 / 75    | 0 / 125  | –        |
| recomp       | 6    | standard | 50 / 67  | 111 / 128  | 100 / 161 | 128 / 128 | 128 / 128 | 67 / 194   | 70 / 200   | 0 / 305  | –        |
| lose_fat     | 4    | standard | 64 / 93  | 114 / 125  | 121 / 175 | 121 / 121 | 114 / 129 | 64 / 182   | 100 / 206  | 50 / 256 | –        |
| lose_fat     | 3    | standard | 58 / 83  | 100 / 117  | 108 / 163 | 125 / 125 | 125 / 125 | 75 / 167   | 100 / 200  | 43 / 221 | –        |
| lose_fat     | 4    | long     | 71 / 86  | 86 / 100   | 100 / 157 | 129 / 129 | 121 / 121 | 93 / 257   | 100 / 319  | 0 / 388  | –        |
| lose_fat     | 2    | short    | 27 / 41  | 55 / 55    | 82 / 95   | 36 / 36   | 55 / 55   | 55 / 82    | 50 / 75    | 0 / 100  | –        |
| lose_fat     | 6    | standard | 50 / 67  | 111 / 128  | 100 / 156 | 117 / 117 | 106 / 114 | 67 / 228   | 100 / 300  | 50 / 350 | –        |
| athletic     | 4    | standard | 63 / 81  | 81 / 103   | 119 / 144 | 113 / 113 | 125 / 125 | 94 / 166   | 60 / 125   | 0 / 170  | 0 / 83   |
| athletic     | 3    | standard | 71 / 82  | 71 / 96    | 114 / 136 | 107 / 107 | 107 / 107 | 107 / 139  | 67 / 111   | 0 / 133  | 0 / 100  |
| athletic     | 4    | long     | 75 / 97  | 94 / 119   | 119 / 156 | 125 / 125 | 125 / 125 | 81 / 188   | 80 / 180   | 0 / 240  | 50 / 117 |
| athletic     | 2    | short    | 50 / 63  | 50 / 63    | 100 / 100 | 17 / 17   | 50 / 50   | 50 / 75    | 0 / 19     | 0 / 75   | 0 / 60   |
| athletic     | 6    | standard | 60 / 75  | 90 / 105   | 90 / 140  | 130 / 130 | 120 / 127 | 75 / 173   | 62 / 165   | 23 / 250 | 50 / 106 |

### Credit against the budget: Full home gym, novice

| Goal         | Days | Length   | quads    | hamstrings | glutes    | chest     | lats      | upper_back | side_delts | abs      | calves   |
| ------------ | ---- | -------- | -------- | ---------- | --------- | --------- | --------- | ---------- | ---------- | -------- | -------- |
| build_muscle | 4    | standard | 75 / 94  | 63 / 100   | 113 / 138 | 119 / 119 | 113 / 113 | 94 / 169   | 60 / 135   | 0 / 175  | 0 / 100  |
| build_muscle | 3    | standard | 64 / 86  | 86 / 118   | 129 / 139 | 100 / 100 | 114 / 114 | 93 / 150   | 67 / 106   | 0 / 128  | 0 / 120  |
| build_muscle | 4    | long     | 81 / 94  | 75 / 116   | 106 / 156 | 125 / 125 | 125 / 125 | 81 / 216   | 70 / 190   | 0 / 300  | 0 / 83   |
| build_muscle | 2    | short    | 50 / 63  | 50 / 63    | 100 / 100 | 25 / 25   | 50 / 50   | 50 / 75    | 25 / 44    | 0 / 75   | 0 / 90   |
| build_muscle | 6    | standard | 60 / 75  | 90 / 113   | 90 / 145  | 130 / 130 | 125 / 125 | 70 / 173   | 54 / 169   | 0 / 246  | 38 / 94  |
| recomp       | 4    | standard | 64 / 86  | 107 / 129  | 129 / 164 | 121 / 121 | 107 / 107 | 64 / 171   | 88 / 188   | 0 / 200  | –        |
| recomp       | 3    | standard | 75 / 100 | 83 / 108   | 125 / 158 | 125 / 125 | 100 / 100 | 50 / 138   | 86 / 179   | 0 / 186  | –        |
| recomp       | 4    | long     | 64 / 93  | 114 / 125  | 121 / 179 | 121 / 121 | 100 / 100 | 43 / 196   | 100 / 269  | 0 / 319  | –        |
| recomp       | 2    | short    | 27 / 41  | 55 / 55    | 82 / 82   | 45 / 45   | 55 / 55   | 55 / 95    | 50 / 75    | 0 / 125  | –        |
| recomp       | 6    | standard | 50 / 67  | 111 / 128  | 100 / 161 | 128 / 128 | 128 / 128 | 67 / 194   | 70 / 200   | 0 / 305  | –        |
| lose_fat     | 4    | standard | 50 / 79  | 107 / 118  | 129 / 168 | 121 / 121 | 114 / 125 | 64 / 186   | 100 / 213  | 38 / 256 | –        |
| lose_fat     | 3    | standard | 50 / 75  | 117 / 129  | 117 / 158 | 125 / 125 | 108 / 108 | 58 / 167   | 114 / 214  | 0 / 236  | –        |
| lose_fat     | 4    | long     | 43 / 57  | 114 / 125  | 100 / 154 | 121 / 121 | 121 / 121 | 93 / 257   | 100 / 306  | 0 / 400  | –        |
| lose_fat     | 2    | short    | 55 / 68  | 55 / 68    | 109 / 123 | 36 / 36   | 55 / 55   | 55 / 82    | 50 / 75    | 0 / 100  | –        |
| lose_fat     | 6    | standard | 67 / 75  | 100 / 125  | 100 / 164 | 122 / 122 | 122 / 122 | 83 / 239   | 90 / 305   | 0 / 380  | –        |
| athletic     | 4    | standard | 63 / 81  | 81 / 103   | 119 / 144 | 113 / 113 | 125 / 125 | 94 / 166   | 60 / 125   | 0 / 170  | 0 / 83   |
| athletic     | 3    | standard | 71 / 82  | 71 / 96    | 114 / 139 | 107 / 107 | 107 / 107 | 107 / 139  | 67 / 117   | 0 / 139  | 0 / 100  |
| athletic     | 4    | long     | 75 / 97  | 94 / 119   | 119 / 156 | 125 / 125 | 125 / 125 | 81 / 191   | 80 / 185   | 0 / 265  | 50 / 117 |
| athletic     | 2    | short    | 50 / 63  | 50 / 63    | 100 / 100 | 17 / 17   | 50 / 50   | 50 / 75    | 0 / 19     | 0 / 75   | 0 / 60   |
| athletic     | 6    | standard | 60 / 75  | 90 / 105   | 90 / 145  | 130 / 130 | 105 / 105 | 60 / 168   | 54 / 177   | 0 / 262  | 38 / 94  |

Muscles over 160% in total: 164

Bodyweight only, left out of the cap tables: of the 30 runs per Goal (both lifters, 2 to 6 days, every Length), how many have a week with a Muscle over 130% through primary credit, how many weeks, and the highest:

| Goal         | Runs over | Weeks over | Highest                                          |
| ------------ | --------- | ---------- | ------------------------------------------------ |
| build_muscle | 14 of 30  | 56         | 340% (intermediate, 6 days long, week 1, glutes) |
| recomp       | 19 of 30  | 76         | 472% (novice, 6 days long, week 3, glutes)       |
| lose_fat     | 20 of 30  | 80         | 456% (novice, 6 days long, week 3, glutes)       |
| athletic     | 14 of 30  | 56         | 340% (intermediate, 6 days long, week 1, glutes) |

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

- **Should calves cost build_muscle its back squat?** See [The library's gaps](#the-librarys-gaps). Calves could count only primary credit, or back squat could get a weekly rule like athletic's. The cap (#128) makes it sharper, as a week holds one squat pick.
- **Is the 130% cap enough?** Through primary credit it holds, but total credit is over 160% for abs, upper back, side delts and glutes in 164 combinations, up to 400% (lose_fat abs at 4 days Long), and Bodyweight only goes over the cap through primary credit. See [Progression](#progression).
- **Should curls and triceps extensions ever be planned?** They're in the library but no budget reaches them.

## Limits of this model

- Every Workout is done exactly as planned, with no skipped Sets or Manual Workouts, and Assessment Workouts aren't counted.
- Workouts fall on fixed days. The lifter reaches every target, so no Exercise Misses, no RPE is logged, and four weeks never reach the deload week.
- Each Workout is planned at the moment it's done, so the recovery filter judges each Set exactly 24, 48 or more hours later. On the phone the plan is rebuilt on the day's first visit, which can be sooner.
- The planner is deterministic, so the 3 averaged weeks are one repeating cycle, not 3 samples.
