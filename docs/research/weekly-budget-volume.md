# Weekly Budget: how many Sets per Muscle

Research for the planner's Weekly Budget. Written 2026-11-04.

**Vocabulary.** Terms follow `GLOSSARY.md`. In this repo Volume means kg × reps, but the papers use "volume" to mean a count of sets. To avoid the clash, this document says **weekly Sets**. A **credited Set** is a Set after the planner's crediting rule: 1 for each primary Muscle and 0.5 for each secondary. A paper's "session" is a Workout here.

## Summary

- **The evidence is good for hypertrophy and thin for everything else.** At least 10 weekly Sets per Muscle is the supported threshold for growth, and 12 to 20 is a sensible range. No trial tells us how many Sets recomposition needs, and fat loss does not depend on Set count at all. The lose_fat, recomp and athletic numbers below are reasoned from adjacent evidence, and each is labelled as such.
- **Most of the dose-response data does not cover most of our Muscles.** The main meta-regression has hypertrophy data for quads, pecs, triceps, biceps, front delts, traps and leg-curl hamstrings. It has no entries for glutes, lats, side delts or abs [1]. Applying its numbers to those Muscles is extrapolation.
- **Days per week should not change the Weekly Budget for biological reasons.** With weekly Sets equal, frequency has no consistent effect on growth [1, 5, 6]. Days matter because they set the time available, and because a second weekly exposure helps strength [1].
- **Time is the real constraint, and it depends on Workout Length.** Two 30-minute Workouts miss every Goal's minimum on a barbell-first selection, and with dumbbells only lose_fat just reaches it. The Glossary says the Weekly Budget comes from Goal and days only, so the planner needs a fill order to handle this (see [Scaling rule](#scaling-rule)).
- **0.5 for a secondary Muscle holds up.** The weight is fine. The problem is one set of tags: 8 squat-pattern Exercises credit hamstrings 0.5, and the two MRI trials that measured it found squats did not grow hamstrings [20, 21].
- **The library blocks some budgets.** The "Bodyweight only" preset has no Exercise that credits lats, so that budget can never be met. There is no calf raise and no curl in the library.

## Recommended table

Values are **credited Sets per Muscle per week** at 4 days per week, which is the reference point for the scaling rule.

| Muscle      | lose_fat<br>min / target | recomp<br>min / target | build_muscle<br>min / target | athletic<br>min / target |
| ----------- | ------------------------ | ---------------------- | ---------------------------- | ------------------------ |
| quads       | 6 / 10                   | 10 / 14                | 10 / 16                      | 8 / 12                   |
| hamstrings  | 6 / 10                   | 10 / 14                | 10 / 16                      | 8 / 12                   |
| glutes      | 6 / 10                   | 10 / 14                | 10 / 16                      | 8 / 12                   |
| chest       | 6 / 10                   | 10 / 14                | 10 / 16                      | 6 / 10                   |
| lats        | 6 / 10                   | 10 / 14                | 10 / 16                      | 6 / 10                   |
| upper_back  | 6 / 10                   | 10 / 14                | 10 / 16                      | 6 / 10                   |
| side_delts  | 4 / 6                    | 4 / 8                  | 6 / 10                       | 4 / 6                    |
| abs         | 4 / 6                    | 4 / 8                  | 6 / 10                       | 4 / 8                    |
| **Support** | Low                      | Very low (judgement)   | Moderate to high             | Low                      |

```ts
type BudgetedMuscle = "quads" | "hamstrings" | "glutes" | "chest" | "lats" | "upper_back" | "side_delts" | "abs";

type Dose = { min: number; target: number };

const dose = (min: number, target: number): Dose => ({ min, target });

const row = (lower: Dose, upper: Dose, side_delts: Dose, abs: Dose): Record<BudgetedMuscle, Dose> => ({
  quads: lower,
  hamstrings: lower,
  glutes: lower,
  chest: upper,
  lats: upper,
  upper_back: upper,
  side_delts,
  abs,
});

// Credited Sets per week: 1 per primary Muscle, 0.5 per secondary
export const BASE_WEEKLY_BUDGET: Record<Goal, Record<BudgetedMuscle, Dose>> = {
  lose_fat: row(dose(6, 10), dose(6, 10), dose(4, 6), dose(4, 6)),
  recomp: row(dose(10, 14), dose(10, 14), dose(4, 8), dose(4, 8)),
  build_muscle: row(dose(10, 16), dose(10, 16), dose(6, 10), dose(6, 10)),
  athletic: row(dose(8, 12), dose(6, 10), dose(4, 6), dose(4, 8)),
};

export const DAYS_SCALE: Record<Goal, Record<2 | 3 | 4 | 5 | 6, number>> = {
  lose_fat: { 2: 0.8, 3: 1, 4: 1, 5: 1, 6: 1 },
  athletic: { 2: 0.8, 3: 1, 4: 1, 5: 1, 6: 1 },
  recomp: { 2: 0.75, 3: 0.875, 4: 1, 5: 1.125, 6: 1.25 },
  build_muscle: { 2: 0.75, 3: 0.875, 4: 1, 5: 1.125, 6: 1.25 },
};

export const ABSOLUTE_FLOOR = 4; // credited Sets per Muscle per week
export const MAX_CREDITED_PER_MUSCLE_DAY = 10; // soft cap
export const MIN_WEEKLY_EXPOSURES = 2; // Workouts per week per budgeted Muscle
export const MAX_SETS_PER_EXERCISE_DAY = 4;

// Half rounds up
export const weeklyBudget = (goal: Goal, days: 2 | 3 | 4 | 5 | 6, muscle: BudgetedMuscle): number => {
  const { min, target } = BASE_WEEKLY_BUDGET[goal][muscle];
  return Math.max(min, Math.floor(target * DAYS_SCALE[goal][days] + 0.5));
};
```

## Scaling rule

`budget = max(min, round(target × DAYS_SCALE))`. The results:

| Goal         | Muscle group              | 2 days | 3 days | 4 days | 5 days | 6 days |
| ------------ | ------------------------- | ------ | ------ | ------ | ------ | ------ |
| lose_fat     | six main Muscles          | 8      | 10     | 10     | 10     | 10     |
|              | side_delts, abs           | 5      | 6      | 6      | 6      | 6      |
| recomp       | six main Muscles          | 11     | 12     | 14     | 16     | 18     |
|              | side_delts, abs           | 6      | 7      | 8      | 9      | 10     |
| build_muscle | six main Muscles          | 12     | 14     | 16     | 18     | 20     |
|              | side_delts, abs           | 8      | 9      | 10     | 11     | 13     |
| athletic     | quads, hamstrings, glutes | 10     | 12     | 12     | 12     | 12     |
|              | chest, lats, upper_back   | 8      | 10     | 10     | 10     | 10     |
|              | side_delts                | 5      | 6      | 6      | 6      | 6      |
|              | abs                       | 6      | 8      | 8      | 8      | 8      |

Why the factors have these shapes:

- **Below 4 days, the budget shrinks** because the time runs out, not because lower frequency needs fewer Sets.
- **Above 4 days, build_muscle and recomp grow** because weekly Sets still add hypertrophy past 16 at a falling rate [1], and people who train 5 or 6 days have the time. The ceiling of 20 is the top of the 12 to 20 range [3] and sits below the region where data gets scarce, about 25 and up [1].
- **lose_fat and athletic stay flat** because strength reaches a plateau at low weekly Sets [1] and the fat-loss evidence shows no benefit from more [8, 9]. Extra days spread the same Sets out.

**Fill order, so a short Workout Length degrades predictably.** Per week, fill in this order and stop when time runs out:

1. Every budgeted Muscle to `ABSOLUTE_FLOOR` (4).
2. Every budgeted Muscle to the Goal's `min`.
3. Every budgeted Muscle towards the scaled budget, largest gap first, with side_delts and abs last.

This keeps the Glossary definition intact: the Weekly Budget stays a function of Goal and days, and Workout Length decides how much of it is delivered.

## Q1. Weekly Sets per Muscle for each Goal

**Support ratings.** _High_: several meta-analyses or a position stand agree. _Moderate_: one strong analysis or several trials. _Low_: indirect or a few small studies. _Very low_: judgement.

### build_muscle

| Claim                                                         | Number          | Support                                            | Source                 |
| ------------------------------------------------------------- | --------------- | -------------------------------------------------- | ---------------------- |
| Smallest dose with a detectable effect                        | 4 credited Sets | Moderate                                           | [1]                    |
| Threshold for enhanced growth                                 | at least 10     | High (position stand, umbrella review)             | [2, 4]                 |
| Sensible range                                                | 12 to 20        | Moderate (6 studies pooled, trained, age 18 to 35) | [3]                    |
| Point where each extra detectable gain gets noticeably dearer | about 18        | Moderate                                           | [1]                    |
| More than 20 gives more growth                                | Unclear         | Low (trials conflict)                              | [1, 3, 15, 16, 17, 18] |

- Pelland et al. pooled 67 studies and 2,058 participants [1]. Growth rises with weekly Sets, with diminishing returns and no clear plateau. The marginal slope was 0.24% per Set at about 12 fractional Sets (95% CrI 0.15 to 0.33).
- Their efficiency tiers use a smallest detectable effect of 2.05%. Sets needed for one more detectable gain: about 6 between 5 and 10 Sets, 8.5 between 11 and 18, 10.75 between 19 and 29, and 12.5 between 30 and 42. Above 42 the data is insufficient. They caution that few studies explored 25 or more [1].
- The earlier meta-regression found 0.37% more gain per weekly Set [14]. Its authors could only resolve the response up to about 10 weekly Sets (34 groups in 15 studies).
- ACSM's 2026 position stand reports hypertrophy "enhanced by higher volumes (≥10 sets/wk)" [2]. The abstract does not say whether that is per Muscle. An umbrella review states at least 10 per week per muscle group [4].
- Baz-Valle et al. found no difference between 12 to 20 and more than 20 weekly Sets for quads (p = 0.19) or biceps (p = 0.59), and an advantage for triceps above 20 (p = 0.01) [3].
- Individual trials above 20 disagree:
  - For more: 32 weekly Sets beat 16 in magnitude [15], and higher Set counts beat lower for several sites [16].
  - No benefit: 12, 18 and 24 weekly Sets gave similar growth in strong lifters [17]; 9, 18 and 27 weekly biceps Sets did not differ significantly [18].
  - Also no benefit: 1.5 times more weekly Sets gave no extra growth in strength-trained athletes [19, accepted manuscript, Set counts not in the abstract].

**Recommendation: min 10, target 16.** The target falls inside the supported range and just before the tier where extra Sets get dearer. The range also fits within available time for most users.

**A fair caveat on 2 reps in reserve.** About 78% of the hypertrophy effects in Pelland's data used some definition of failure, though only about 30% clearly defined momentary failure [1]. Robinson et al. found hypertrophy improves as Sets end closer to failure [13], while ACSM found training to failure did not consistently matter [2]. An 8-rep Set at 2 reps in reserve is reasonable, but per-Set growth may be slightly below what those studies measured. Keep the numbers, and don't treat them as exact.

### lose_fat

**There is no evidence that a higher Set count causes more fat loss.** Across 54 pooled trials, resistance training lowered body fat percentage by 1.46% against no exercise, and training volume was not associated with the effect size [9]. Fat loss comes from the energy deficit. Exercise guidance for obesity favours aerobic work for weight loss and resistance training for preserving lean mass [10].

So the Budget's job here is to hold on to muscle and strength, which is what the Goal's copy promises ("while holding on to strength").

- Resistance training with caloric restriction maintained lean mass in people with overweight or obesity, across 114 trials [12].
- A deficit impairs lean mass gain, with about 500 kcal per day preventing gains, while strength gains are comparable [7].
- One randomised trial in trained men found 5 sets per exercise no better than 3 for lean mass during restriction [8].
- A review of lean athletes found that programs of at least 10 weekly Sets showed low to no lean mass loss, mostly in women, but concluded the evidence is insufficient [11].
- Outside a deficit, strength and size in younger people held for up to 32 weeks on 1 Workout and 1 set per exercise per week, if intensity was kept. Older people may need up to 2 Workouts and 2 to 3 sets per exercise [22]. Intensity was the key variable [22].

**Recommendation: min 6, target 10** (support: low). The 10 comes from [11] and is well above maintenance levels. The 6 covers the older-adult maintenance dose [22], with a margin for the deficit, which those maintenance studies did not impose. **Keep load up rather than Sets**: reducing Working Levels during a deficit would remove the variable that matters most [22].

### recomp

**No trial I could find sets Sets per Muscle for recomposition.** The only review on the topic is narrative. It says recomposition occurs in trained people and depends on progressive training and nutrition, without giving a Set dose [24]. One useful data point: athletes aiming to lose 0.7% of body weight per week gained lean mass on 4 strength Workouts per week, while those aiming for 1.4% did not [23]. The rate of loss mattered, not Set count.

**Recommendation: min 10, target 14** (support: very low). The floor matches build_muscle because the user still wants growth. The lower target is my judgement: [8] shows no extra benefit from more Sets in a deficit. Using the build_muscle row unchanged would also be defensible. Whether recomp happens depends mostly on nutrition, which a Weekly Budget cannot control.

### athletic

The evidence supports strength as a route to athletic ability [25] and low weekly Sets for strength gains. It says little about Sets for speed or power, and the available evidence points to load, not Set count.

- Strength shows strong diminishing returns and a functional plateau: detectable gains stop at about 4 fractional Sets at a 3.96% threshold, though smaller gains may continue [1].
- Ralston et al. found more strength from 5 to 9 or at least 10 weekly sets per exercise than from 5 or fewer, with small differences of 0.15 to 0.18 effect size [26].
- Trained men gained strength equally on 1, 3 or 5 sets per exercise [16].
- In competitive athletes the best dose was 85% of 1RM, 2 days per week, 8 sets per muscle group [27]. This 2004 analysis is old, and the abstract does not say whether the 8 is per Workout.
- Swinton et al. (295 studies, 6,710 participants) found improvements driven mainly by load and outcome: heaviest loads for maximum strength, about 30% 1RM for vertical jump, and 40 to 70% for power [28]. ACSM agrees on the load ranges [2].
- Injury prevention gives some support for more Sets (a 10% increase in strength training volume cut injury risk by more than 4 percentage points), but from 6 studies and a post-hoc regression [29].
- Aerobic work does not hurt size or maximum strength but does reduce explosive strength, more so in the same Workout [30].

**Recommendation: min 8 lower body and 6 upper body, target 12 and 10** (support: low). Lower-body numbers are higher for sprinting and jumping, which is my inference and not a finding. **Set count is the wrong lever here**: see [conflict 3](#conflicts-with-decisions-already-made).

## Q2. Days per week, frequency and per-day limits

**Frequency, weekly Sets equal:**

- **Hypertrophy: no consistent effect.** 91.3% probability the slope is above zero, but the credible interval includes zero (0.32%, 95% CrI -0.14 to 0.82) and direct-effects models did not confirm it [1]. Schoenfeld et al. (25 studies) call this strong evidence that frequency does not meaningfully affect hypertrophy with volume equated [5]. A new preprint of 16 volume-equated trials agrees (g = -0.06, 95% CI -0.24 to 0.13), though it rates certainty low to very low [6, not peer reviewed]. 3 and 6 Workouts a week gave similar results in one trial [31].
- **Without equal Sets, more frequent training gives modestly more growth** [5], because it allows more Sets.
- **Strength: mixed, with a real effect from the first extra exposure.** Pelland's model finds frequency helps, with 100% probability of a positive slope: about 12.7% gain at 1 per week and 17.3% at 2, then steep diminishing returns [1]. Older analyses found no significant effect once volume was equated [32, 33]. ACSM recommends at least 2 per week [2].

**Rule that follows:** days per week should not raise or lower a Muscle's dose for its own sake. Spread each budgeted Muscle across **at least 2 Workouts a week**, which costs nothing and helps strength. Days per week is not the same as Muscle frequency: 2 full-body Workouts give each Muscle 2 exposures, and so can a 4-day split.

**Maximum per Muscle per training day.**

- The per-session meta-regression puts the point of undetectable superiority at **about 11 fractional Sets for hypertrophy** and **about 2 direct sets for strength** [34, preprint, not peer reviewed].
- The authors stress that these are not upper limits. Data thins out quickly: mean 5.95 fractional Sets per session, range 0 to 24. Many studies trained one muscle, so whole-body extrapolation needs caution, and they did not study burnout or injury [34].
- Sets of 2 to 3 for strength agree with ACSM [2].

**Recommendation:** soft cap of **10 credited Sets per Muscle per day**, and **at most 4 Sets per Exercise per Workout**. The first is a rounded-down reading of [34]. The second is my judgement from the 2-set strength figure and ACSM's 2 to 3 sets, leaving room for hypertrophy. At these budgets the daily cap rarely binds: 12 Sets at 2 days is 6 per Workout, and 20 at 6 days is under 4. Time binds first.

## Q3. Which Muscles deserve a budget

The eight proposed are defensible. Three need attention, and one Muscle left out has the strongest case to be added.

"By-product" below is credited Sets on a Muscle in a modelled build_muscle target week, with no direct budget, for the barbell-first and dumbbell selections described under Q5. Treat these as rough, since the model picks a cheapest mix.

| Muscle      | Proposed | Exercises primary / secondary | By-product                 | Verdict                                                                                                                                                                                                                                                         |
| ----------- | -------- | ----------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| quads       | Yes      | 13 / 1                        | n/a                        | **Keep.** Best-evidenced Muscle [1, 3, 20, 21].                                                                                                                                                                                                                 |
| hamstrings  | Yes      | 10 / 11                       | n/a                        | **Keep, and require hinge work.** Squats don't grow them [20, 21]. Pelland's only direct hamstring data is the leg curl [1]; hinges are unmeasured there.                                                                                                       |
| glutes      | Yes      | 26 / 4                        | 24 to 32 at a budget of 16 | **Keep as a check, not a driver.** Every quads Exercise (13 of 13) also credits glutes as primary. Squats grow glutes as well as hip thrusts do [21], and full squats grew them 6.7% [20]. This budget will almost always be met without being asked.           |
| chest       | Yes      | 13 / 0                        | n/a                        | **Keep.**                                                                                                                                                                                                                                                       |
| lats        | Yes      | 12 / 4                        | n/a                        | **Keep.** No hypertrophy data in [1]. Can't be delivered on Bodyweight only.                                                                                                                                                                                    |
| upper_back  | Yes      | 13 / 13                       | 16 to 19                   | **Keep, but it nearly duplicates lats.** 9 of 12 lats primaries also credit upper_back as primary, so the two can barely be steered apart.                                                                                                                      |
| side_delts  | Yes      | 1 / 6                         | n/a                        | **Keep at the lower row.** Direct raises work: 10 Sets a week grew lateral delts 3.3 to 4.6% in 8 weeks [35]. I found no trial on whether presses grow them. One Exercise is the only primary, needing dumbbells or bands.                                      |
| abs         | Yes      | 10 / 23                       | n/a                        | **Keep at the lower row, for trunk function and user expectation.** I found no dose-response data. Budget support is the weakest of the eight.                                                                                                                  |
| calves      | No       | 0 / 8                         | 0 to 8                     | **Add for athletic and build_muscle (min 4, target 6) once a calf raise exists.** Strongest challenge, see below.                                                                                                                                               |
| biceps      | No       | 1 / 11                        | 5.5 to 8                   | **No budget, but watch the floor.** See below.                                                                                                                                                                                                                  |
| triceps     | No       | 17 / 2                        | 16                         | **No budget.** Bench alone grew triceps 11.9% against 17.6% for pecs [36]. Pressing covers it.                                                                                                                                                                  |
| front_delts | No       | 7 / 16                        | 8                          | **No budget.** Pressing covers them, and they are heavily loaded already.                                                                                                                                                                                       |
| rear_delts  | No       | 3 / 7                         | 5.5 to 6                   | **No budget.** Above the 4-Set floor from rowing at build_muscle. No outcome data found.                                                                                                                                                                        |
| adductors   | No       | 1 / 10                        | 4 to 8                     | **No budget.** Full squats grew them 6.2% [20], and squats beat hip thrusts here [21].                                                                                                                                                                          |
| traps       | No       | 2 / 6                         | 5 to 13                    | **No budget.** Pelland counts rows and pulldowns as indirect work [1].                                                                                                                                                                                          |
| forearms    | No       | 2 / 15                        | 8 to 17                    | **No budget.** No outcome data found. Grip work is a by-product of pulling and carrying.                                                                                                                                                                        |
| obliques    | No       | 3 / 14                        | 2 to 5                     | **No budget.** No dose evidence found.                                                                                                                                                                                                                          |
| lower_back  | No       | 2 / 9                         | 8 to 16                    | **No budget.** Evidence is mixed: free-weight lifts raise lumbar multifidus activity [37, acute EMG only], yet Romanian deadlifts did not raise isolated lumbar extension torque in one trial [38]. A budget would add load to a Muscle that has an injury tag. |

**Challenge 1: calves.** Excluding them is justified today only because the library can't deliver them. No Exercise has calves as primary. A barbell-first week gets 0 credited Sets. Direct calf raises grew the muscle in untrained adults, and that study describes the triceps surae as relatively unresponsive to training and prone to atrophy with inactivity [39]. No trial I found shows that squats or lunges grow them. They also matter plausibly for sprinting and jumping, the athletic Goal's stated aim, though that is inference.

**Challenge 2: biceps.** Rowing covers the floor, but the case is weaker than for triceps. In untrained men, pulldowns grew biceps as well as curls did [40]. Adding curls to multi-joint work gave no extra benefit in trained men, measured only by arm circumference [41]. Yet curls beat rows 11.06% to 5.16% in a small within-subject trial [42]. At lose_fat in the barbell-first week the by-product falls to about 3.5, just under the 4-Set floor (rear_delts too). I would not budget it, but a curl Exercise would give build_muscle users a way to act on it.

**Challenge 3: the evidence does not separate Muscles by dose.** There are no good data for "side delts need fewer Sets than quads". Their lower numbers reflect priority and time, not physiology.

## Q4. Crediting 1 and 0.5

**The evidence supports it, and I'd keep it.**

- 0.5 outperformed both 1 and 0 for every comparison [1]. For hypertrophy, 2 × log(BF) was 9.48 over counting all Sets fully and 10.29 over counting direct Sets only. For strength, 18.21 and 45.96.
- The authors' conclusion is that an indirect Set seems close to half a direct Set on average, while noting the assumption that all indirect work is worth exactly half [1].

**Caveats, none of which argues for changing the weight:**

- The comparison tested three fixed weights, not a continuous estimate. Later exploratory work puts an indirect Set nearer **32% for hypertrophy** and **16% for strength** [34, preprint]. So 0.5 is probably a little generous, more so for strength. Simplicity justifies keeping it.
- For per-session strength, counting direct sets only fitted best [34].

**One place the evidence does argue against current data: primary and secondary tags.** The 0.5 was validated on the paper's own direct and indirect classification [1, Table 1], and our tags differ from it in two ways that matter:

| Tagging in the library                                                                                                                                                                                                      | Evidence                                                                                                                                                                                                 | Effect                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **hamstrings secondary on 8 squat-pattern Exercises** (`bulgarian-split-squat`, `split-squat`, `reverse-lunge`, `step-up`, `dumbbell-bulgarian-split-squat`, `dumbbell-reverse-lunge`, `dumbbell-step-up`, `cossack-squat`) | Hamstring volume did not change after 10 weeks of squats on MRI [20]; little to no growth from squats or hip thrusts [21]. Those trials used bilateral back squats, so lunges and step-ups are inferred. | **Worth acting on.** It lets squat-pattern work fill a hamstring budget. Removing it adds about 4 to 8 Sets, or 7 to 13 minutes, a week to a build_muscle target. |
| **triceps primary on 17 Exercises**, including presses                                                                                                                                                                      | Pelland counts presses as indirect for triceps [1, Table 1A], though [36] shows substantial growth                                                                                                       | No effect now since triceps has no budget. Matters if one is added.                                                                                               |

**Suggested fix:** either remove hamstrings from those 8 Exercises' secondaries, or have the planner require that hamstrings budget comes from hinge-pattern Sets. All delivery numbers in Q5 assume this fix.

## Q5. What fits in a Workout

**Library timing.** 74 Exercises, 60 to 180 seconds per Set, mean 103 and median 105. `secondsPerSet` already includes rest. I assume **5 minutes per Workout for warming up**, which is not in `secondsPerSet` and is not from a source. Time-efficient programming advises restricting warm-ups [43], so it could be shorter.

**Sets per Workout, with 5 minutes of warm-up:**

| Workout Length | 60 s | 75 s | 90 s | 105 s | 120 s | 150 s | 180 s |
| -------------- | ---- | ---- | ---- | ----- | ----- | ----- | ----- |
| 30 min         | 25   | 20   | 16   | 14    | 12    | 10    | 8     |
| 45 min         | 40   | 32   | 26   | 22    | 20    | 16    | 13    |
| 60 min         | 55   | 44   | 36   | 31    | 27    | 22    | 18    |

**Why a plain division overstates the problem.** One Set credits several Muscles. A build_muscle target needs 116 credited Sets across the eight Muscles, which would be about 200 minutes at one credit per Set. It takes about 73 Sets because each Set credits about 1.6.

**Method.** I solved a linear program over the real library: find the fewest minutes per week that meets every Muscle's budget, with the 1 and 0.5 rule, per equipment preset and with hamstrings getting no squat-pattern credit. Availability follows `expandTags` in `packages/engines/src/equipment.ts`. The cheapest mix over the whole library is unrealistic (incline push-ups for everyone), so the results below use two selections of loaded Exercises: "barbell-first" (Full home gym, 20 Exercises) and "dumbbell" (Dumbbells + bench, 20 Exercises). Each Exercise is capped at 4 × days per week, which is 4 Sets per Workout on average. The result is still a **lower bound**: it ignores injuries, how Exercises divide across days, and the need to vary Exercises. It sometimes picks an unrealistic week, such as 16 deadlift Sets.

**Minutes per week needed (barbell-first):**

| Goal         | Floor (all 4s) | Min      | 2 days | 3 days | 4 days | 5 days | 6 days |
| ------------ | -------------- | -------- | ------ | ------ | ------ | ------ | ------ |
| lose_fat     | 36             | 52       | 69     | 86     | 86     | 86     | 86     |
| recomp       | 36             | 83 to 85 | 96     | 103    | 120    | 136    | 153    |
| build_muscle | 36             | 86 to 88 | 108    | 123    | 138    | 155    | 173    |
| athletic     | 36             | 60       | 77     | 94     | 94     | 94     | 94     |

**Minutes per week available** (days × (Length − 5)):

| Workout Length | 2 days | 3 days | 4 days | 5 days | 6 days |
| -------------- | ------ | ------ | ------ | ------ | ------ |
| 30 min         | 50     | 75     | 100    | 125    | 150    |
| 45 min         | 80     | 120    | 160    | 200    | 240    |
| 60 min         | 110    | 165    | 220    | 275    | 330    |

**Result per combination (barbell-first).** Each cell shows the 30, 45 and 60 minute results in order.

- **OK**: the scaled budget fits with at least 15% spare time.
- **tight**: it fits with under 15% spare, so a real week may fall short.
- **min**: only the Goal's minimum fits.
- **floor**: only the 4-Set floor fits.

| Goal         | 2 days                | 3 days             | 4 days           | 5 days        | 6 days        |
| ------------ | --------------------- | ------------------ | ---------------- | ------------- | ------------- |
| lose_fat     | floor / tight / OK    | min / OK / OK      | tight / OK / OK  | OK / OK / OK  | OK / OK / OK  |
| recomp       | floor / floor / tight | floor / tight / OK | min / OK / OK    | min / OK / OK | min / OK / OK |
| build_muscle | floor / floor / tight | floor / min / OK   | min / tight / OK | min / OK / OK | min / OK / OK |
| athletic     | floor / tight / OK    | min / OK / OK      | tight / OK / OK  | OK / OK / OK  | OK / OK / OK  |

The dumbbell selection is about 5% faster overall, which lifts a few cells by one step (for example lose_fat at 2 days and 30 minutes reaches min), with the same overall pattern.

**Flags:**

- **2 days at 30 minutes: never reaches any Goal's minimum with barbells.** 50 minutes a week holds about 26 Sets. That is still every Muscle at 4 or above, so it has a real training effect, but the app should not imply it matches the Goal.
- **build_muscle and recomp at 2 days and 45 minutes: floor only.** Even the minimum needs about 85 minutes against 80 available.
- **build_muscle and recomp at 3 days and 30 minutes: floor only.**
- **30 minutes never delivers full build_muscle or recomp at any day count**, with barbells. Budget and time cross only at about 6 days in the dumbbell selection, for recomp.
- **2-day budgets imply long Workouts.** At 2 days, build_muscle's 60-minute Workout is about 28 Sets, 54 minutes of work, a heavy day.
- **Equipment changes the picture more than Goal does in some cases:**
  - **Bodyweight only cannot deliver lats.** No available Exercise credits lats at all, at any Goal. Its only side_delts credit is 0.5 from `pike-push-up` and `side-plank`. Without lats, the other seven take about 101 minutes for build_muscle.
  - **Kettlebells has no direct side_delts Exercise**: 0.5 credits only. Its lower bound is about 20% above the other presets (126 minutes for a build_muscle target, against about 103).
  - Minimal (bar + bands) is fine, with a lower bound of 99 minutes.
- **Supersets are an unused lever.** Supersets and similar techniques roughly halve training time while keeping Set count, though they are probably better for hypertrophy than strength [43]. They would change the 30-minute results but aren't modelled by `secondsPerSet`.

## Q6. Training experience, age and sex

**Experience: not enough to justify a new Profile field.**

- Pelland adjusted for training status (28 untrained and 39 trained studies), and the volume slope was "not often influenced" by moderators. These analyses were exploratory and hypothesis-generating [1].
- Swinton's model was not improved by adding training status or sex [28].
- Ralston concluded that novice and intermediate men gain less from the lowest doses than from medium or high ones, while either medium or high doses suit well-trained people [26].
- Well-trained powerlifters are the group where very low doses were not enough [1, citing 44]. In trained men, one set 2 to 3 times a week still built 1RM strength [45].
- ACSM 2009 raises frequency with experience, from 2 to 3 days for novices to 4 to 5 for advanced [46]. That is frequency, not per-Muscle Sets, and the user already chooses days. The 2026 update does not list training status among factors that change outcomes, though I could only read its abstract [2].

**Recommendation:** no experience field. New users start at `min` and move to the scaled budget over about 4 weeks, tracked from History, which already exists. An untrained person doesn't need the target to progress, and starting lower is kinder on soreness. That ramp is my judgement, not a finding. Assessment results would give a further signal if needed.

**Age: don't scale numbers by age.**

- Data on older adults favours more Sets, not fewer: in adults of at least 50, higher Set counts were linked to greater lean mass gains, and older age to smaller gains (β = 0.05 and -0.03) [47].
- In healthy adults of 65 and over, 2 Workouts per week and 2 to 3 sets per exercise were best for strength, from small numbers of studies and with low quality. Nine studies of morphology found no single Set variable significantly predicted the effect [48].
- Maintaining size needs more in older people than young [22, 49]. In one trial, doses of one-third and one-ninth preserved hypertrophy in the young but not the old [49].
- The main dose-response data has a mean age of 25 [1], so its numbers carry an extrapolation risk for older users.

`min` of 6 for lose_fat already meets the 4 to 6 sets implied by [22]. Age should change Exercise selection and progression, not budget. NSCA has a position statement on older adults [50], but I could not read its prescription.

**Sex: no adjustment.** Men and women grew similarly (ES 0.07, p = 0.31), with females doing better in relative upper-body strength [51]. Note that 79.1% of participants in [1] were male.

## Conflicts with decisions already made

1. **Weekly Budget "set by the user's Goal and days per week" (Glossary).** Reasonable as a definition, but delivery depends on Workout Length too. With barbell-first selection, 8 of the 60 Goal, days and Length combinations reach only the 4-Set floor, all at 30 or 45 minutes on 2 or 3 days, and 9 more reach only the minimum. Either use the fill order above and tell the user what they're getting, or make Workout Length an input. I recommend the fill order.
2. **Crediting 0.5 (accepted).** No conflict in the weight. There is a conflict in the data: 8 squat-pattern Exercises credit hamstrings without evidence. See [Q4](#q4-crediting-1-and-05).
3. **Every prescribed Set is 8 reps at about 2 reps in reserve, including for athletic.** This is the largest conflict. The Goal's copy says "Get faster, more powerful and better conditioned". The evidence ties strength to at least 80% 1RM and power to 30 to 70% 1RM with a fast concentric phase [2, 28]. An 8-rep Set at 2 in reserve is about a 10RM load, which is below 80% 1RM on the usual tables (I did not check that conversion against a source). Changing athletic's Set count won't produce what the copy promises; changing its Set prescription might. The same point applies, less strongly, to any strength-focused use.
4. **Eight budgeted Muscles.** Holds up, with two changes: calves should join for athletic and build_muscle once a calf raise exists, and glutes will almost never drive selection.
5. **"Every movement pattern (except carry) has at least one option for every equipment preset" (`exercises.ts`).** True for Patterns, but budgets are per Muscle. Bodyweight only has no lats option. The planner needs to treat an undeliverable Muscle as not budgeted, or the Week Ledger will show a permanent shortfall. Kettlebells and Bodyweight only need a direct side_delts option.
6. **Library gaps.** No calf raise, no curl, and one side_delts primary. These limit the budgets more than the evidence does.

## What's weak or uncertain

- **Most Muscles lack direct dose-response data.** Numbers for glutes, lats, upper_back, side_delts and abs are extrapolated from others [1]. The same numbers are used across them because nothing better exists.
- **lose_fat, recomp and athletic numbers are judgement.** They are reasoned from adjacent evidence, and could be off by several Sets with no way to tell.
- **Numbers above about 25 weekly Sets are poorly studied**, and trials conflict from 20 upward [1, 15, 17, 18, 19].
- **Studies are short and young.** Interventions average 10.4 weeks, age 25, 79% male [1]. Nothing here tells us what suits a year or more of use, or injury and burnout risk [34].
- **Exposure differs from our prescription.** Most effects involved some form of training to failure [1], the mean set was about 10 reps, and strength studies had low weekly Sets (mean 8.14). Heavier strength work is poorly represented [34].
- **Key per-session numbers are from a preprint.** I found no journal version of [34]. Treat 11 and 2 as provisional, and it says itself to read them cautiously.
- **Efficiency tiers depend on a chosen threshold.** They rest on a smallest detectable effect of 2.05% and 3.96%, estimated from separate data [1]. A smaller threshold would shift the tiers.
- **Whether every logged Set should count equally is open.** The Week Ledger counts Sets at any RPE from 6 to 10, though an RPE 6 Set is further from failure, and hypertrophy may fall with that [13]. Timed holds such as `plank` and carries also count as Sets, and I found no evidence for how they compare. I would count all Sets for now, for simplicity.
- **The delivery model is a lower bound.** The 5-minute warm-up is an assumption. Real weeks will run longer.
- **The ramp for new users, the 4 Sets per Exercise cap and the days scale are judgement**, shaped by evidence but not derived from it.

## Verification notes

- **Read in full text:** [1] in its SportRχiv preprint (September 2024), and [34]. I read [26] and parts of [48] in the open-access version.
- **Read as abstract only** (via Europe PMC, OpenAlex or Crossref): every other source unless noted. PubMed and PMC blocked automated access, and most journals are paywalled.
- **[1] preprint versus published:** the published abstract matches on the methods, the headline findings and the 67 studies and 2,058 participants. Tiers, slopes, thresholds and Table 1 come from the preprint, and **I could not check them against the published version**.
- **Could not verify:**
  - ACSM 2026 [2]: full text, so whether "≥10 sets/wk" means per Muscle.
  - NSCA 2019 [50]: its prescription numbers. The numbers often quoted (2 to 3 sets of 1 to 2 multi-joint exercises per muscle group) are not used here.
  - The %1RM of an 8-rep Set at 2 reps in reserve, stated in conflict 3 without a source.
  - Remmert et al. [34]: whether it has since been published in a journal. I found no such record.
- **Citation trap:** DOI 10.1007/s40279-024-02006-3 was attached to Pelland et al. in a search result. It is actually Swinton et al. [28]. The correct DOI for Pelland is 10.1007/s40279-025-02344-w.
- **Pelland's published year:** the DOI record has 2025 online, in Sports Medicine 56(2), 2026.
- **ACSM 2009** [46]: the author list did not resolve in the database, so it is cited under ACSM.

## Sources

1. Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC. The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains. _Sports Medicine_. 2026;56(2):481-505. https://doi.org/10.1007/s40279-025-02344-w. Preprint read in full: https://sportrxiv.org/index.php/server/preprint/view/460
2. Currier BS, D'Souza AC, Singh MAF, et al. American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews. _Med Sci Sports Exerc_. 2026;58(4):851-872. https://doi.org/10.1249/mss.0000000000003897
3. Baz-Valle E, Balsalobre-Fernández C, Alix-Fages C, Santos-Concejero J. A Systematic Review of the Effects of Different Resistance Training Volumes on Muscle Hypertrophy. _J Hum Kinet_. 2022;81:199. https://doi.org/10.2478/hukin-2022-0017
4. Bernárdez-Vázquez R, Raya-González J, Castillo D, Beato M. Resistance Training Variables for Optimization of Muscle Hypertrophy: An Umbrella Review. _Front Sports Act Living_. 2022;4:949021. https://doi.org/10.3389/fspor.2022.949021
5. Schoenfeld BJ, Grgic J, Krieger J. How many times per week should a muscle be trained to maximize muscle hypertrophy? _J Sports Sci_. 2019;37(11):1286-1295. https://doi.org/10.1080/02640414.2018.1555906
6. Boutagy AG, McKean MR. Resistance Training Frequency and Muscle Hypertrophy: A Systematic Review and Meta-Analysis of Volume-Equated Trials. _medRxiv_. 2026. Not peer reviewed. https://doi.org/10.64898/2026.10.07.26365015
7. Murphy CA, Koehler K. Energy deficiency impairs resistance training gains in lean mass but not strength. _Scand J Med Sci Sports_. 2022;32:125. https://doi.org/10.1111/sms.14075
8. Roth C, Schwiete C, Happ K, et al. Resistance training volume does not influence lean mass preservation during energy restriction in trained males. _Scand J Med Sci Sports_. 2023;33:20. https://doi.org/10.1111/sms.14237
9. Wewege MA, Desai I, Honey C, et al. The Effect of Resistance Training in Healthy Adults on Body Fat Percentage, Fat Mass and Visceral Fat. _Sports Med_. 2022;52(2):287-300. https://doi.org/10.1007/s40279-021-01562-2
10. Oppert JM, Bellicha A, van Baak MA, et al. Exercise training in the management of overweight and obesity in adults. _Obes Rev_. 2021;22(S4):e13273. https://doi.org/10.1111/obr.13273
11. Roth C, Schoenfeld BJ, Behringer M. Lean mass sparing in resistance-trained athletes during caloric restriction: the role of resistance training volume. _Eur J Appl Physiol_. 2022;122:1129. https://doi.org/10.1007/s00421-022-04896-5
12. Lopez P, Taaffe DR, Galvão DA, et al. Resistance training effectiveness on body composition and body weight outcomes in individuals with overweight and obesity across the lifespan. _Obes Rev_. 2022;23(5):e13428. https://doi.org/10.1111/obr.13428
13. Robinson ZP, Pelland JC, Remmert JF, et al. Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy. _Sports Med_. 2024;54(9):2209-2231. https://doi.org/10.1007/s40279-024-02069-2
14. Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and increases in muscle mass. _J Sports Sci_. 2017;35(11):1073-1082. https://doi.org/10.1080/02640414.2016.1210197
15. Brigatto FA, Lima LEM, Germano MD, et al. High Resistance-Training Volume Enhances Muscle Thickness in Resistance-Trained Men. _J Strength Cond Res_. 2022;36(1):22-30. https://doi.org/10.1519/jsc.0000000000003413
16. Schoenfeld BJ, Contreras B, Krieger J, et al. Resistance Training Volume Enhances Muscle Hypertrophy but Not Strength in Trained Men. _Med Sci Sports Exerc_. 2019;51(1):94. https://doi.org/10.1249/mss.0000000000001764
17. Aube D, Wadhi T, Rauch J, et al. Progressive Resistance Training Volume: Effects on Muscle Thickness, Mass, and Strength Adaptations in Resistance-Trained Individuals. _J Strength Cond Res_. 2022;36(3):600-607. https://doi.org/10.1519/jsc.0000000000003524
18. Heaselgrave SR, Blacker J, Smeuninx B, et al. Dose-Response Relationship of Weekly Resistance-Training Volume and Frequency on Muscular Adaptations in Trained Men. _Int J Sports Physiol Perform_. 2019;14(3):360-368. https://doi.org/10.1123/ijspp.2018-0427
19. Räntilä A, Ahtiainen JP. Exploring the Upper Limits of Resistance Training Volume for Muscle Hypertrophy and Strength in Trained Athletes. _J Sci Sport Exerc_. Accepted manuscript, 2026. https://doi.org/10.1007/s42978-026-00387-7
20. Kubo K, Ikebukuro T, Yata H. Effects of squat training with different depths on lower limb muscle volumes. _Eur J Appl Physiol_. 2019;119(9):1933-1942. https://doi.org/10.1007/s00421-019-04181-y
21. Plotkin DL, Rodas MA, Vigotsky AD, et al. Hip thrust and back squat training elicit similar gluteus muscle hypertrophy and transfer similarly to the deadlift. _Front Physiol_. 2023;14:1279170. https://doi.org/10.3389/fphys.2023.1279170
22. Spiering BA, Mujika I, Sharp MA, Foulis SA. Maintaining Physical Performance: The Minimal Dose of Exercise Needed to Preserve Endurance and Strength Over Time. _J Strength Cond Res_. 2021;35(5):1449-1458. https://doi.org/10.1519/jsc.0000000000003964
23. Garthe I, Raastad T, Refsnes PE, et al. Effect of Two Different Weight-Loss Rates on Body Composition and Strength and Power-Related Performance in Elite Athletes. _Int J Sport Nutr Exerc Metab_. 2011;21(2):97-104. https://doi.org/10.1123/ijsnem.21.2.97
24. Barakat C, Pearson J, Escalante G, et al. Body Recomposition: Can Trained Individuals Build Muscle and Lose Fat at the Same Time? _Strength Cond J_. 2020;42:7. https://doi.org/10.1519/ssc.0000000000000584
25. Suchomel TJ, Nimphius S, Stone MH. The Importance of Muscular Strength in Athletic Performance. _Sports Med_. 2016;46(10):1419-1449. https://doi.org/10.1007/s40279-016-0486-0
26. Ralston GW, Kilgore L, Wyatt FB, Baker JS. The Effect of Weekly Set Volume on Strength Gain: A Meta-Analysis. _Sports Med_. 2017;47(12):2585-2601. https://doi.org/10.1007/s40279-017-0762-7
27. Peterson MD, Rhea MR, Alvar BA. Maximizing strength development in athletes: a meta-analysis to determine the dose-response relationship. _J Strength Cond Res_. 2004;18(2):377. https://doi.org/10.1519/R-12842.1
28. Swinton PA, Schoenfeld BJ, Murphy A. Dose-Response Modelling of Resistance Exercise Across Outcome Domains in Strength and Conditioning: A Meta-analysis. _Sports Med_. 2024;54(6):1579-1594. https://doi.org/10.1007/s40279-024-02006-3
29. Lauersen JB, Andersen TE, Andersen LB. Strength training as superior, dose-dependent and safe prevention of acute and overuse sports injuries. _Br J Sports Med_. 2018;52(24):1557-1563. https://doi.org/10.1136/bjsports-2018-099078
30. Schumann M, Feuerbacher JF, Sünkeler M, et al. Compatibility of Concurrent Aerobic and Strength Training for Skeletal Muscle Size and Function. _Sports Med_. 2022;52(3):601-612. https://doi.org/10.1007/s40279-021-01587-7
31. Saric J, Lisica D, Orlic I, et al. Resistance Training Frequencies of 3 and 6 Times Per Week Produce Similar Muscular Adaptations in Resistance-Trained Men. _J Strength Cond Res_. 2019;33(7S):S122-S129. https://doi.org/10.1519/jsc.0000000000002909
32. Grgic J, Schoenfeld BJ, Davies TB, et al. Effect of Resistance Training Frequency on Gains in Muscular Strength. _Sports Med_. 2018;48(5):1207-1220. https://doi.org/10.1007/s40279-018-0872-x
33. Ralston GW, Kilgore L, Wyatt FB, et al. Weekly Training Frequency Effects on Strength Gain: A Meta-Analysis. _Sports Med Open_. 2018;4(1):36. https://doi.org/10.1186/s40798-018-0149-9
34. Remmert JF, Pelland JC, Robinson ZP, Hinson SR, Zourdos MC. Is There Too Much of a Good Thing? Meta-Regressions of the Effect of Per-Session Volume on Hypertrophy and Strength. _SportRχiv_. 2025. Not peer reviewed. https://doi.org/10.51224/SRXIV.537
35. Larsen S, Wolf M, Schoenfeld BJ, et al. Dumbbell versus cable lateral raises for lateral deltoid hypertrophy: an experimental study. _Front Physiol_. 2025;16:1611468. https://doi.org/10.3389/fphys.2025.1611468
36. Ogasawara R, Loenneke JP, Thiebaud RS, Abe T. Low-Load Bench Press Training to Fatigue Results in Muscle Hypertrophy Similar to High-Load Bench Press Training. _Int J Clin Med_. 2013;4(2):114-121. https://doi.org/10.4236/ijcm.2013.42022
37. Martuscello JM, Nuzzo JL, Ashley CD, et al. Systematic Review of Core Muscle Activity During Physical Fitness Exercises. _J Strength Cond Res_. 2013;27(6):1684-1698. https://doi.org/10.1519/jsc.0b013e318291b8da
38. Fisher J, Bruce-Low S, Smith D. A randomized trial to consider the effect of Romanian deadlift exercise on the development of lumbar extension strength. _Phys Ther Sport_. 2013;14(3):139-145. https://doi.org/10.1016/j.ptsp.2012.04.001
39. Kinoshita M, Maeo S, Kobayashi Y, et al. Triceps surae muscle hypertrophy is greater after standing versus seated calf-raise training. _Front Physiol_. 2023;14:1272106. https://doi.org/10.3389/fphys.2023.1272106
40. Gentil P, Soares S, Bottaro M. Single vs. Multi-Joint Resistance Exercises: Effects on Muscle Strength and Hypertrophy. _Asian J Sports Med_. 2015;6(1):e24057. https://doi.org/10.5812/asjsm.24057
41. de França HS, Branco PAN, Guedes DP, et al. The effects of adding single-joint exercises to a multi-joint exercise resistance training program on upper body muscle strength and size in trained men. _Appl Physiol Nutr Metab_. 2015;40(8):822-826. https://doi.org/10.1139/apnm-2015-0109
42. Mannarino P, Matta T, Lima J, et al. Single-Joint Exercise Results in Higher Hypertrophy of Elbow Flexors Than Multijoint Exercise. _J Strength Cond Res_. 2021;35(10):2677-2681. https://doi.org/10.1519/jsc.0000000000003234
43. Iversen VM, Norum M, Schoenfeld BJ, Fimland MS. No Time to Lift? Designing Time-Efficient Training Programs for Strength and Hypertrophy: A Narrative Review. _Sports Med_. 2021;51:2079. https://doi.org/10.1007/s40279-021-01490-1
44. Androulakis-Korakakis P, Michalopoulos N, Fisher JP, et al. The Minimum Effective Training Dose Required for 1RM Strength in Powerlifters. _Front Sports Act Living_. 2021;3:713655. https://doi.org/10.3389/fspor.2021.713655
45. Androulakis-Korakakis P, Fisher JP, Steele J. The Minimum Effective Training Dose Required to Increase 1RM Strength in Resistance-Trained Men. _Sports Med_. 2020;50(4):751-765. https://doi.org/10.1007/s40279-019-01236-0
46. American College of Sports Medicine. Progression Models in Resistance Training for Healthy Adults. _Med Sci Sports Exerc_. 2009;41(3):687-708. https://doi.org/10.1249/mss.0b013e3181915670
47. Peterson MD, Sen A, Gordon PM. Influence of Resistance Exercise on Lean Body Mass in Aging Adults: A Meta-Analysis. _Med Sci Sports Exerc_. 2011;43(2):249-258. https://doi.org/10.1249/mss.0b013e3181eb6265
48. Borde R, Hortobágyi T, Granacher U. Dose-Response Relationships of Resistance Training in Healthy Old Adults. _Sports Med_. 2015;45(12):1693-1720. https://doi.org/10.1007/s40279-015-0385-9
49. Bickel CS, Cross JM, Bamman MM. Exercise Dosing to Retain Resistance Training Adaptations in Young and Older Adults. _Med Sci Sports Exerc_. 2011;43(7):1177-1187. https://doi.org/10.1249/mss.0b013e318207c15d
50. Fragala MS, Cadore EL, Dorgo S, et al. Resistance Training for Older Adults: Position Statement From the National Strength and Conditioning Association. _J Strength Cond Res_. 2019;33(8):2019-2052. https://doi.org/10.1519/jsc.0000000000003230
51. Roberts BM, Nuckols G, Krieger JW. Sex Differences in Resistance Training: A Systematic Review and Meta-Analysis. _J Strength Cond Res_. 2020;34(5):1448-1460. https://doi.org/10.1519/jsc.0000000000003521
