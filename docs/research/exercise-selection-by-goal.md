# Exercise selection by Goal: which Exercises

Research for the planner's Exercise picking. Written 2026-11-04. Companion to `weekly-budget-volume.md`, which asked how many Sets. This file asks which Exercises, and does not repeat that file's findings.

**Vocabulary.** Terms follow `GLOSSARY.md`. A **credited Set** is a Set after the 1 and 0.5 crediting rule. **Weekly Sets** means a count of Sets, to avoid the clash with Volume. A paper's "session" is a Workout here. **Budgeted credit** is credit on the eight budgeted Muscles only, which is all the planner can act on. **Two-sided** and **one-sided** mean `unilateral: false` and `true`. **Ballistic** means an Exercise where the load or body is accelerated through the end of the movement, such as a swing or a jump.

## Summary

- **For hypertrophy, Exercise choice matters far less than the Sets.** With weekly Sets equal, whole-muscle growth is about the same for multi-joint and single-joint, free-weight and machine, and one-sided and two-sided work [2, 8, 13]. ACSM's overview rates most of these as not shown or insufficient data [1]. Credit per Set is a fair baseline in principle.
- **The baseline has a practical flaw the evidence did not predict.** Credit counts Muscle tags and cannot see load. On the real library it spends only about half of a Full home gym week on loaded Exercises, and gives back squat and barbell bench together at most 5 of about 78 build_muscle Sets. It needs a guard, described below.
- **No evidence supports selecting Exercises differently to lose fat.** Multi-joint and single-joint programs of equal work gave the same body composition change [5]. Large-muscle Exercises do cost more energy, but my estimate of the gain from selection is about 2% of a typical weekly deficit. Diet outweighs exercise by about 3.5 to 1 for weight loss [28, 29].
- **Credit per minute does not do what the proposal says.** The Weekly Budget caps the work, so a faster pick does not fit more work in. On a Full home gym it saved about 3 to 7 minutes a week, cut loaded Sets to about 16 to 38%, and pushed users down the ladders (bodyweight squat in place of goblet squat). That goes against the existing file's "keep load up" advice. It also gives the time saving to the Goal with the most spare time.
- **The athletic proposal's boost has the wrong targets.** One-sided work has no advantage over two-sided for sprinting, change of direction or two-sided jumping, and it costs a little two-sided strength [13, 48, 49]. Carries have almost no outcome evidence. Swings are the best of the three, though still low quality. The strongest evidence in this area is for lower-body strength, and for plyometrics, which the library doesn't have [41, 42, 43, 61].
- **Most athletic benefits survive 8-rep Sets, apart from power.** An 8-rep Set at 2 reps in reserve is about 75 to 80% 1RM, and strength transfer to sprinting did not depend on load or reps per set [41]. Power work needs 30 to 70% 1RM and fast lifting [1], so a grinding 8-rep Set does not deliver it. Swings and jumps do.
- **The library needs jumps for athletic.** They are the biggest evidence gap in the library, and more valuable than anything else missing for any Goal.

## Recommended rule per Goal

Keep the existing score, then multiply by a Goal factor. Every number below is **judgement**. The evidence gives only the direction, and the simulation shows only that the numbers behave reasonably.

| Goal         | Proposal                                                         | Verdict                         | Rule                                                                                                                                 | Confidence in direction                                                                                      |
| ------------ | ---------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| build_muscle | Most credit per Set                                              | **Keep**, add the shared guards | Factor 1                                                                                                                             | Moderate to high that selection matters little. Low that credit is a good proxy for stimulus.                |
| recomp       | Halfway between build_muscle and lose_fat                        | **Drop the halfway**            | Factor 1, same as build_muscle                                                                                                       | Low. No selection evidence exists. This is the simplest defensible rule.                                     |
| lose_fat     | Most credit per minute                                           | **Change**                      | Load tilt × 1.15 for external load, times a soft time tilt limited to ± 10%                                                          | Low. This is a product choice, and it must not be presented as burning more fat.                             |
| athletic     | + 25% one-sided, carries, swings; one carry or swing per Workout | **Change**                      | Load tilt × 1.15, ballistic × 1.25, one one-sided squat or hinge Exercise a week. No one-sided boost. No carry boost or requirement. | Moderate that strength comes first. Moderate to high that one-sided boosting isn't justified. Low on swings. |

**Shared guards, for every Goal:**

1. **Rep-cap guard.** If a bodyweight Exercise's Working Level has reached the 20-rep cap, skip it and use its `progression` if that is available. This uses `loadType`, `progression` and the Working Level, which the planner already has. It can no longer be prescribed at about 2 reps in reserve within the cap, and hypertrophy falls as Sets end further from failure [16]. Band and weighted Exercises scale by level or load, so they need no guard.
2. **Weekly variety cap.** Use the same Exercise in at most `ceil(days / 2)` Workouts a week. This covers the same Muscle from more than one angle [3, 7, 10] and stops a week such as 12 Sets of deadlift.
3. **No random rotation.** Keep picks stable from week to week, with ties going to an Exercise used last week. Random rotation gave no gain in size [12], and excessive rotation may hurt [10]. It also breaks Previous Sets and Working Level progression.

```ts
// All numbers are judgement. The evidence supports the direction only.
const LOAD_TILT = 1.15; // external load over bodyweight
const BALLISTIC_TILT = 1.25; // athletic only
const TIME_REFERENCE_S = 105; // library median secondsPerSet

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const loadTilt = (e: Exercise) => (e.loadType === "external" ? LOAD_TILT : 1);
const timeTilt = (e: Exercise) => clamp(Math.sqrt(TIME_REFERENCE_S / e.secondsPerSet), 0.9, 1.1);

export const goalFactor = (goal: Goal, e: Exercise): number => {
  switch (goal) {
    case "build_muscle":
    case "recomp":
      return 1;
    case "lose_fat":
      return loadTilt(e) * timeTilt(e);
    case "athletic":
      return loadTilt(e) * (e.ballistic ? BALLISTIC_TILT : 1);
  }
};

// score(e) = baselineCreditScore(e) * goalFactor(goal, e)
```

**Athletic's extra rules:**

- At least one one-sided squat or hinge Exercise a week, when available. This keeps the one-sided strength and one-sided jump benefit [13] without giving up two-sided strength.
- Put ballistic Exercises first in the Workout. This is my judgement. ACSM finds strength favoured by exercises done early in the Workout [1], and fatigue reduces jump gains [71].
- Cue every lift: "lift as fast as you can on the way up". It costs nothing, and it is the part of power training that survives 8 reps [72, 73].
- Carries stay in the library but get no boost and no requirement. If spare time remains after the Budget, 2 Sets once a week is acceptable. That is a preference, not an evidence-based requirement.
- Once jumps exist: start 2 Workouts a week with 2 jump Exercises of 3 Sets each. That is 48 contacts, close to the 50 or more per Workout linked to better jump gains [62]. It adds about 15 minutes a week (my estimate at 75 seconds a Set), which isn't in the simulated numbers.

**One new field: `ballistic: boolean`.** The proposal can't be built from the fields listed. Carries can be found through `patterns`, but nothing marks a swing. The only accidental way to find them is "hinge Exercise whose every equipment option includes kettlebells", which matches exactly the 2 swings today and would break on the first dumbbell swing. The field is worth it because:

- Jumps need the same flag.
- Ballistic Exercises also need different handling elsewhere: they have no 2-reps-in-reserve target.
- `unilateral` and `loadType` cannot express it.

**Honest copy for lose_fat.** Don't claim that these Exercises burn more fat. Suggested wording: "Fat loss comes mostly from what you eat. Your training is built to hold on to muscle and strength while you lose it, and to get done in good time."

## Q1. build_muscle: does the baseline hold?

**Support ratings** match the existing file. _High_: several meta-analyses or a position stand agree. _Moderate_: one strong analysis or several trials. _Low_: indirect or a few small studies. _Very low_: judgement.

| Comparison, weekly Sets equal                    | Result                                                             | Support         | Source       |
| ------------------------------------------------ | ------------------------------------------------------------------ | --------------- | ------------ |
| Multi-joint vs single-joint, whole muscle        | No meaningful difference                                           | Moderate        | [2, 4, 5]    |
| Multi-joint vs single-joint, regions of a muscle | Single-joint can reach what multi-joint misses                     | Low to moderate | [3, 7]       |
| Free-weight vs machine                           | No difference, SMD -0.055 (CI -0.397 to 0.287)                     | Moderate        | [8, 9]       |
| One-sided vs two-sided                           | No difference, g = 0.01 (CI -0.25 to 0.26), GRADE low              | Low to moderate | [13, 14]     |
| Variety                                          | Some systematic variation helps regional growth, too much may hurt | Low             | [10, 11, 12] |
| Push-up vs bench at matched load (40% 1RM)       | Similar                                                            | Low             | [17]         |

- **Multi-joint vs single-joint.** Rosa et al. pooled 7 studies (10 comparisons) and found a trivial difference, including under equal Sets, with similar whole-muscle growth [2]. ACSM calls the evidence insufficient for hypertrophy [1].
- **Regions matter more than whole-muscle numbers.** In the best recent trial (MRI, 17 untrained adults, within-subject), knee extension and leg press grew the vasti and whole quadriceps about equally (+7.1% vs +4.9%, comparable). Rectus femoris grew +13.2% vs +1.1%, favouring knee extension. Leg press alone grew gluteus maximus (+15.4%) and adductor magnus (+6.2%) [3]. Triceps showed the same split: bench grew the lateral head more, and a lying triceps press grew the long head more [7]. Exercise variation grew all quadriceps heads where a single Exercise missed some [11].
- **So multi-joint Exercises give more growth per Set, across more Muscles.** That is what credit per Set rewards, so the direction of the baseline holds.
- **Adding single-joint work to a multi-joint program adds little.** It raised arm circumference (5.2% vs 4.0%) but not strength or skinfolds in untrained men [6]. One small trial favoured curls over rows for elbow flexors [77]. The existing file covers the rest.
- **Machines are close to a non-question here.** Only 4 Exercises can use a cable machine, and none needs a fixed machine. Modality effects are specific to the test: free-weight strength rises more with free weights (SMD -0.21), which doesn't affect size [8].
- **Variety.** Kassiano et al. (8 studies, 241 young men) conclude that variation should be systematic and that redundant or very frequent changes may hinder gains [10]. Random rotation via an app gave similar size and strength, and better motivation, in 21 trained men [12]. In [12], one quadriceps head grew only in the fixed group. ACSM found insufficient data [1].

**Does the baseline hold?** As a principle, yes. As a planner rule on this library, only with guards, for three reasons:

1. **Credit can't see load.** Budgeted credit is 1.5 for a push-up and 1.0 for a barbell bench, entirely because the push-up carries an `abs` secondary tag. The tag decides the pick, not any measured stimulus. Load does not change hypertrophy much on its own [1], and a push-up at matched relative load works [17]. The real limit is that a bodyweight Exercise only works near failure if the ladder keeps up, hence the rep-cap guard.
2. **Credit does not separate a stretch position or a region.** Nothing in the fields can. I would not add a field for this. The evidence is regional and the Budget is per Muscle.
3. **Greedy picking repeats winners.** At 4 days, the baseline gave deadlift up to 12 Sets a week.

## Q2. lose_fat

### Do some Exercises cost more energy?

Yes, mainly with muscle mass and load, not joint count.

| Finding                                                          | Number                                                                                               | Source |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| Low-load steady state, half squat vs biceps curl vs lat pulldown | About 11 vs 3 vs 4 kcal/min                                                                          | [18]   |
| Estimated at 80% 1RM                                             | Half squat 35.9, leg extension 25.7, leg press 19.9, bench 11.4, lat pulldown 9.6, curl 8.5 kcal/min | [18]   |
| 5 × 10 leg press vs chest fly, including 90 minutes after        | About 90 vs 50 to 54 kcal                                                                            | [20]   |
| Whole Workout, weights at 75% 1RM                                | 8.8 kcal/min vs 9.5 treadmill at 70% HRmax                                                           | [22]   |
| Continuous swings for 12 minutes                                 | 65% of VO2max                                                                                        | [23]   |

Notes on those numbers:

- Energy rises with load [18], and prediction equations use load and distance lifted [19].
- Single-joint leg extension beat multi-joint leg press in [18], which is why I say muscle mass and not joint count. The 80% figures are extrapolated from low loads, and the authors note the squat value is 50% above a previous estimate [18].
- Swings measured continuously [23] say little about an 8-rep Set, which lasts about 20 seconds (my estimate).

**How much that's worth (my arithmetic).** From [20], a large-muscle Set costs about 8 kcal more than a small-muscle Set. Moving 10 weekly Sets from small to large would be about 80 kcal a week. Against a deficit of 500 kcal a day [34], that is about 2%. The Weekly Budget also limits this swap, since chest Sets can't turn into leg Sets.

### Does density, shorter rest or circuit work change fat loss?

Density raises energy per minute, not necessarily energy per Workout.

- **Supersets.** Matched work gave 34.7 vs 26.3 kJ/min, but total aerobic energy did not differ (1,010 vs 954 kJ), and after-exercise oxygen use was 79 vs 60 kJ [21]. By my arithmetic that is about 18 kcal more per Workout, or about 2% of the deficit over 4 Workouts.
- **Rest.** Going from 3 minutes to 1 minute did not change total energy in leg press or chest fly [20]. Rest of 1 minute or less cut load and reps by 15 to 55% in bench press [24].
- **Rest and growth.** Hypertrophy gains a little from rest above 60 seconds, with no appreciable difference above 90 seconds [25].
- **After-exercise metabolism.** Short, intense resistance work may raise resting energy use the next day more than traditional work, in one acute trial of 17 trained men [27]. There is no long-term fat outcome.
- **Circuits.** Against no training, circuit-based resistance work lowered fat mass (-0.70%, -1.04 kg) and raised muscle mass (+1.18 kg) across 45 studies [26]. These are not comparisons with traditional training at equal work, so they can't show that the circuit format caused the fat loss. Subgroups favoured low to moderate intensity, more than 12 reps and 10 to 30 seconds rest between Exercises [26]. That prescription is not the one this app uses. ACSM found circuit training beats no training and set structure does not consistently matter [1].
- **Multi-joint vs single-joint for fat.** The direct test found no body composition difference at equal work, in 36 active men over 8 weeks [5]. VO2max did rise more with multi-joint work (12.5% vs 5.1%) [5].

### How big is this compared with diet?

| Comparison                               | Diet  | Exercise | Both   | Source |
| ---------------------------------------- | ----- | -------- | ------ | ------ |
| 12-month randomised trial, % body weight | -8.5% | -2.4%    | -10.8% | [28]   |
| 493 studies of about 15 weeks, kg        | -10.7 | -2.9     | -11.0  | [29]   |

- Both of those used aerobic exercise. Resistance training on its own loses less: aerobic work beat it for body and fat mass [32], and ACSM says resistance training does not enhance weight loss, though it may raise fat-free mass [31].
- Across reviews, exercise gives -1.3 to -2.6 kg of fat. Resistance training saves 0.8 kg of lean mass during weight loss [30].
- The body offsets exercise energy over time: compensation approaches 84% at about 80 weeks [33].

### Is there any evidence-based reason for selection to differ?

**Plainly: no, not for fat loss.** I found no trial where Exercise selection changed fat loss with Sets equal. The direct comparison found no difference [5]. Two weak reasons remain, neither of them about fat:

1. **Keep load up.** Strength and size hold if intensity is kept [35], and a deficit limits lean mass gain more than strength [34]. Heavier Exercises also cost more energy [18]. This supports a load preference, which is the opposite of credit per minute.
2. **Finish sooner.** Lack of time is a commonly reported barrier, and time-efficient programs favour two-sided, multi-joint Exercises [15]. That also points to loaded compound lifts, not easier ladder rungs.

**The honest rationale for a lose_fat preference:** it holds on to strength and gets the Budget done without wasted time. Nothing here makes a user lose more fat.

### Testing credit per minute on the real library

Simulated with a greedy planner, Full home gym, 4 days, 45 minutes, target budgets from the existing file and its hamstring fix (method under [Weak points](#whats-weak-or-uncertain)):

| lose_fat rule                      | Sets a week | Minutes | Loaded Sets | One-sided Sets |
| ---------------------------------- | ----------- | ------- | ----------- | -------------- |
| Baseline                           | 49          | 83      | 43%         | 18%            |
| Credit per minute                  | 55          | 80      | 16%         | 33%            |
| Halfway                            | 51          | 80      | 29%         | 35%            |
| **Recommended** (with variety cap) | 49          | 83      | 63%         | 31%            |

- **It saves 3 minutes** out of 160 available. Across block sizes of 1 to 4 Sets per pick, the saving was 3 to 7 minutes and loaded Sets were 16 to 38%, against 41 to 55% for baseline.
- **The largest saving came with the most equipment.** With my full gym proxy it saved 12 minutes (83 to 71), and loaded Sets held at about 46% because band Exercises count as external. It swapped weights for bands and bodyweight rungs. With dumbbells it saved 5 minutes, and loaded Sets fell from 53% to 34%.
- **The Budget caps the work.** lose_fat's target is 10 credited Sets, so more speed ends the Workout sooner rather than adding work. Adding Sets has no fat-loss benefit in any case [36].
- **It only helps where time is the constraint.** At 2 days and 30 minutes, it delivers 86% of the Budget against 75%, but with only 16% loaded Sets against 54%.
- **The score rewards short rest.** `secondsPerSet` includes rest, so a low score can mean a long rest and not a slow Exercise. A bodyweight squat at 75 seconds scores 1.6 budgeted credit per minute, and a back squat at 180 scores 0.83, with no allowance for what the load does.
- **lose_fat is the wrong Goal for this.** Per the existing file, lose_fat needs 86 minutes a week at target, against 138 for build_muscle. If any Goal needed time help, it would be build_muscle or recomp.

The recommended rule keeps the baseline's time and raises loaded Sets from 43% to 63% (59 to 88% across loaded presets).

## Q3. recomp

**I found no evidence specific to Exercise selection.** A title search for recomposition and resistance or exercise returned nothing relevant beyond the existing narrative review [37].

The nearest evidence:

- Single-joint and multi-joint groups both lost fat and gained fat-free mass, with no difference, in active men at equal work [5].
- In a 4-week trial at a 40% deficit, young men gained 1.2 kg of lean mass and lost 4.8 kg of fat on high protein with 6 days a week of resistance and interval work [38]. Protein was the variable tested, not Exercises.

**Most defensible rule: use the build_muscle baseline, with no time preference.** Reasons:

- Nothing supports a halfway rule. Halfway between a baseline and an unsupported preference is still unsupported.
- The user wants muscle, so the Exercises should match the Goal that builds it.
- Halfway cuts load in the same way: loaded Sets fell from 48% to 27%. It did save 14 minutes a week on a Full home gym, which is a real saving for a Goal short of time, so this is the closest call in this file. If 30-minute recomp weeks matter more than load, a time tilt could be added later.
- A single rule is easier to explain and test.

Whether recomp happens depends on nutrition and training status, which selection can't change [37, 38].

## Q4. athletic

### Evidence by method

| Method                   | Jump                                            | Sprint                                        | Change of direction                   | Strength                          | Case                                                         |
| ------------------------ | ----------------------------------------------- | --------------------------------------------- | ------------------------------------- | --------------------------------- | ------------------------------------------------------------ |
| Heavy two-sided strength | Yes                                             | Yes, r = -0.77 with squat strength [41]       | Unclear [1]                           | Best                              | **Strong** for general transfer, especially in weaker people |
| Plyometrics              | Strongest, ES 0.88, CMJ +8.7% [61]              | Yes in pooled data [63], mixed in others [78] | Yes [64]                              | Weak                              | **Strong** for jumps, moderate for the rest                  |
| Weightlifting            | Beats traditional, ES 0.64 to 0.95 [43, 44, 45] | Not significant [43]                          | Not significant [43]                  | Good                              | Moderate, heterogeneous, needs coaching                      |
| One-sided                | One-sided jumps only, g = 0.35 [13]             | None, g = -0.01 [13]                          | Trend only, g = -0.35, p = 0.058 [13] | One-sided better, two-sided worse | **Weak** beyond specificity                                  |
| Kettlebell swings        | Mixed [52, 54, 55]                              | No data found                                 | No data found                         | Less than weightlifting [54]      | **Low**                                                      |
| Loaded carries           | None found                                      | Small acceleration signal, strongman mix [58] | None found                            | None found                        | **Very low**                                                 |

**Heavy strength.**

- Strength underpins athletic performance in general [40].
- Squat strength gains transfer to sprinting across 15 studies (r = -0.77, sprint ES -0.87, mean 3.11%) [41]. A correlation doesn't prove cause, but the direction agrees with the trials.
- In relatively weak men, heavy squats at 75 to 90% 1RM matched jump squats for jump and sprint, and raised strength far more (31.2% vs 4.5%) [42].
- Reviews advise weaker athletes to build strength before emphasising power, and find that bodyweight, single-joint, plyometric, one-sided and kettlebell work are limited for maximum strength [39].
- This app's users are probably untrained or lightly trained, not athletes, so this matters. It is the main reason strength comes first.

**One-sided.**

- Xin et al. (24 randomised trials, 2026): one-sided work favoured one-sided strength (g = 0.42) and one-sided jumps (g = 0.35). Two-sided work favoured two-sided strength (g = -0.28). There was no difference for two-sided jumps, sprint or hypertrophy, and only a non-significant trend for change of direction, with very low certainty [13].
- Liao et al. agree (ES 0.89 for one-sided jumps, -0.43 for two-sided strength, no difference elsewhere) [48].
- Wu et al. found the same in team sport athletes, with a basketball-only sprint and agility benefit in a subgroup [49].
- Single trials found equal results for sprint, change of direction and strength between split squats and back squats [50], and transfer of strength between step-ups and squats [51].
- **All of this evidence is lower body.** I found nothing that supports one-sided pushing, pulling or core work for athletic performance. Yet 10 of the library's 24 one-sided Exercises are not squat or hinge.

**Loaded carries.**

- The evidence is acute EMG and modelling: high trunk demand, and "carrying events challenged different abilities than the lifting events" [59, 60].
- The one training trial mixed strongman events and found no significant between-group differences over 7 weeks, with small moderate effects going both ways [58].
- I found no trial of carries alone on sprint, jump or change of direction. The McGill suggestion that carrying would enhance lifting programs is a mechanical inference, not an outcome.

**Kettlebell swings.**

- Mechanically credible: power matched jump squats, and net impulse was the highest measured at 32 kg [53].
- Six weeks of swings improved half squat 1RM by 9.8% and jump by 19.8%, with no difference from jump squats, but the study had no control group [52].
- Weightlifting and heavy training beat kettlebells for strength, with no difference in jump [54]. A 10-week kettlebell program did not raise vertical jump [55].
- A scoping review rates confidence as low to very low, in mostly underpowered studies [56].
- Swings also drive high hamstring activation [57], and that is EMG only.

**Plyometrics versus heavy work.** Plyometrics add jump height across many analyses [61, 62, 65], improve sprint [63] and change of direction [64], match weightlifting [43, 45], and can grow muscle (SMD 0.47) [66].

Limits:

- I found no meta-analysis comparing plyometrics directly with traditional strength. The comparison above is indirect, through weightlifting [43, 45].
- A 7-week trial in students saw no significant sprint gain from any method alone, and more strength from combining methods (20%) than from plyometrics (6%) [47].
- Weighted squat jumps at the load that maximised power beat both heavy squats and depth jumps in trained subjects [46].
- Standalone plyometrics did not improve sprint in handball athletes, and jump effects were not significant in adults [78]. Much of the plyometric data is from young athletes.

**Is plyometric work important enough that the library needs jumps?** Yes, for athletic specifically. The Goal's copy promises "faster, more powerful", plyometrics are the most direct evidence-backed way to get there, and they are the one method that isn't changed by the 8-rep prescription. Jumps also need no equipment, so they reach Bodyweight only users. They appear safe in older adults, with no injuries reported in 12 studies [67], and programs that include them reduce ACL injury in sport (IRR 0.40) [68], though those programs include other components.

### What survives 8 reps?

An 8-rep Set at 2 reps in reserve is about a 10RM. Nuzzo et al. estimate about 9 reps at 80% 1RM and 14 at 70% for bench press, and about 15 at 70% in their general model. The older textbook table they update gives 10 reps at 75% [70]. My interpolation is about **75 to 80% 1RM**. That closes the item the existing file left unverified. It is close to, but just under, the at least 80% ACSM links to best strength gains [1].

| Benefit                         | Survives 8 reps at 2 in reserve? | Why                                                                                                                                                                        |
| ------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hypertrophy                     | Yes                              | In the supported range [1]                                                                                                                                                 |
| Strength transfer to sprint     | **Mostly**                       | Reps per set and %1RM did not moderate sprint gains [41]. Heavy groups in [42] used 75 to 90%.                                                                             |
| Maximum strength                | Mostly                           | Just under the at least 80% [1]                                                                                                                                            |
| One-sided strength and jumps    | Yes                              | Trials used moderate to heavy loads [13, 51]                                                                                                                               |
| Injury protection from strength | Likely                           | Not tested at this prescription                                                                                                                                            |
| Power from grinding lifts       | **No**                           | Power needs 30 to 70% 1RM and a fast up phase [1, 69]. Near-failure Sets also blunt jump gains: 20% vs 40% velocity loss gave CMJ +9.5% vs +3.5% with 40% fewer reps [71]. |
| Intent to move fast             | **Yes**                          | Trying to move fast drives the response even when the load moves slowly [73]. Maximal vs half velocity gave CMJ ES 0.63 vs 0.15 [72]. Needs a cue, not an Exercise.        |
| Swings                          | **Yes, with a change**           | Sets of 4 to 10 were studied [53, 54]. Swings aren't near failure, so "2 in reserve" doesn't apply. 3 Sets of 8 is 24 reps, inside ACSM's power volume of 24 or fewer [1]. |
| Jumps                           | **Yes, with a change**           | Reps are low-effort and quality matters. 8 per Set fits, 2 in reserve doesn't. Needs 6 Sets for about 50 contacts [62].                                                    |
| Carries                         | **Doesn't apply**                | A carry has no reps. The cue says "30–40 metres", but its Working Level is kg for 8 reps.                                                                                  |
| Conditioning from swings        | **No**                           | The 65% VO2max came from 12 continuous minutes [23]                                                                                                                        |

So the existing file's conflict 3 is correct on power, but less serious than it reads. An 8-rep athletic Goal still gets most of the strength and transfer benefit. What it loses is power work, which the proposed `ballistic` Exercises restore.

### Testing the proposal on the real library

Full home gym, 4 days, 45 minutes:

| athletic rule                             | Sets | Minutes | Loaded | One-sided | Carry Sets |
| ----------------------------------------- | ---- | ------- | ------ | --------- | ---------- |
| Baseline                                  | 52   | 87      | 40%    | 17%       | 0          |
| + 25% boost                               | 55   | 104     | 51%    | **76%**   | **0**      |
| + 25% boost, one carry or swing a Workout | 59   | 117     | 64%    | 59%       | 8          |
| **Recommended**                           | 51   | 105     | 84%    | 24%       | 0          |

- **A 25% boost is not a mild preference.** Credit values are coarse (mostly in steps of 0.5), so small multipliers flip many ties. One-sided Sets rose to 76%, with `archer-push-up` the most-picked push.
- **The boost cannot pick a carry.** Carries score 0.5 to 2 budgeted credit, because most of their primaries (forearms, traps, obliques) have no Budget. They are chosen only when forced.
- **The requirement is expensive.** It adds 13 minutes a week for Sets that barely reach the Budget. A heavy two-sided lift in those slots has much better evidence behind it.
- **Equipment changes the meaning.** With kettlebells, forcing picks swings. With dumbbells only, it picks carries. Bodyweight only gets neither. Two users on the same Goal get very different work.

## Q5. Goal by Goal: keep, change or drop

The [recommended rule table](#recommended-rule-per-goal) is the answer, in spec form. The results on real presets at 4 days and 45 minutes, with block size 3:

| Preset            | build_muscle min, loaded % (variety cap only) | lose_fat min, loaded % | athletic min, loaded %, swing Sets |
| ----------------- | --------------------------------------------- | ---------------------- | ---------------------------------- |
| Full home gym     | 151, 52%                                      | 83, 63%                | 105, 84%, 0                        |
| Dumbbells + bench | 151, 52%                                      | 80, 59%                | 106, 88%, 0                        |
| Kettlebells       | 145, 49%                                      | 102, 69%               | 109, 85%, 12                       |

The rep-cap guard depends on the user's Working Levels, so it isn't in those numbers. It will raise build_muscle and recomp's loaded share for stronger users, and their minutes too. As an upper bound, a 1.15 tilt on every Exercise took build_muscle from 151 to 159 minutes. Applying it directly to build_muscle, with the variety cap, would have cost delivery in short Workouts (81% vs 86% at 4 days, 30 minutes), which is why build_muscle doesn't use it. The variety cap has a cost of its own: on its own it took build_muscle from 140 to 151 minutes on a Full home gym.

**Why the same load tilt for lose_fat and athletic but not build_muscle?** Size does not depend much on load [1], while strength does [1], and lose_fat and athletic are the two Goals where strength is the job. lose_fat needs it to hold on to strength [34, 35], and athletic needs it to transfer to sprinting and jumping [41, 42].

**Sensitivity.** Tilts from 1.1 to 1.25 give the same picture, since ties flip at about 1.1. Loaded share for lose_fat stayed in the 60s until 1.25 (86%), when time rose from 83 to 92 minutes. So 1.15 is a sensible middle. Don't treat it as more precise than that.

## Q6. Library gaps by Goal

| Goal                   | Missing                                                                                    | Priority                       | Evidence                                                                                                                                                                                    | Needs                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| athletic               | **Jumps**: squat jump, countermovement jump, broad jump, lateral bound, pogo hop, box jump | **High**                       | Mixed types beat one type [62, 63, 64]. Horizontal jumps for sprint [63]. No added benefit from added weight [62, 63].                                                                      | `ballistic`. No 2-in-reserve target. `avoidWith` knee. A ladder from `bodyweight-squat`. Credit as secondary only on quads and glutes, so they add to strength work and don't replace it. |
| athletic               | **Nordic hamstring curl**                                                                  | Medium                         | Halves hamstring injury, RR 0.49, 15 studies, athletes [74]. Small sprint gain, -0.04 s, with bias concerns [75]. About 48 reps a week suggested [79]. ACSM: insufficient for strength [1]. | An anchor for the feet. Muscles: hamstrings.                                                                                                                                              |
| athletic, build_muscle | Calf raise                                                                                 | Medium, already flagged        | Direct growth [76]. **I found no trial tying calf raises to sprint or jump outcomes.** The athletic case remains inference.                                                                 | Existing file's gap                                                                                                                                                                       |
| build_muscle           | Curl                                                                                       | Low to medium, already flagged | [4, 77]                                                                                                                                                                                     | Existing file's gap                                                                                                                                                                       |
| build_muscle           | Overhead triceps extension                                                                 | Low                            | Long head grew with single-joint work and not with bench [7]. Triceps has no Budget.                                                                                                        | Only matters for regional growth                                                                                                                                                          |
| build_muscle           | Knee extension                                                                             | Low                            | Only rectus femoris needs it [3]. Requires a machine or cable.                                                                                                                              | Equipment                                                                                                                                                                                 |
| lose_fat               | **None**                                                                                   | n/a                            | No Exercise-specific fat loss evidence                                                                                                                                                      | Aerobic work beats resistance work for fat [32], but that is a different kind of training, not a library gap. Worth a separate decision.                                                  |
| recomp                 | **None**                                                                                   | n/a                            | None                                                                                                                                                                                        |                                                                                                                                                                                           |
| any                    | Olympic lifts                                                                              | **Don't add**                  | Good for power [1, 43, 44], but complex to teach from a phone, and jumps match them [43, 45]                                                                                                |                                                                                                                                                                                           |
| any                    | Fixed machines, more carries                                                               | **Don't add**                  | No size difference [8]. Very low evidence for carries.                                                                                                                                      |                                                                                                                                                                                           |

## Conflicts with the proposal and existing decisions

**With the proposal:**

1. **lose_fat's rationale doesn't work.** "More work fits in the Workout Length" isn't true while the Weekly Budget caps the work. Per-minute scoring saves 3 to 7 minutes a week.
2. **lose_fat's score works against keeping load up.** The existing file says "keep load up rather than Sets" [35]. Credit per minute cut loaded Sets from 43% to 16%.
3. **The time help goes to the Goal with the most time.** lose_fat needs the fewest minutes of any Goal.
4. **recomp's halfway has no basis**, and it cut loaded Sets too, though it did save 14 minutes a week.
5. **The athletic boost selects mostly the wrong thing.** One-sided work rose to 76%, including upper-body work with no evidence, and at some cost in two-sided strength [13].
6. **The carry requirement rests on very low evidence**, costs time, and is what forces carries in at all.
7. **Swings can't be identified from the listed fields.** This needs the `ballistic` field or a fragile rule.

**With the existing file and code:**

8. **"Every Set is 8 reps" is only true of weighted Exercises.** In `working-levels.ts`, bodyweight runs from 3 to 20 reps, band is 12, core is 10, and timed is seconds. The rep-cap guard depends on this.
9. **The existing file's delivery tables are optimistic for a loaded week.** Its 138-minute build_muscle target is a lower bound for a barbell-first selection. The greedy baseline takes about the same time (140), but only because half its Sets are bodyweight. A week that is about 90% loaded took 159 minutes in my model, about 15% more. Read its "tight" cells with that in mind.
10. **Its conflict 3 is real but narrower than stated.** Power does not survive 8 reps; strength transfer mostly does. "Better conditioned" in the athletic copy gets no support from this selection, and an 8-rep Set of swings won't provide it [23].
11. **Carries don't fit the Set model.** They have a distance cue, a kg-for-8-reps Working Level, and count as Sets. The existing file left open how they count. This is one more reason not to require them.
12. **The results assume the hamstring fix** from the existing file. Without it, the one-sided boost would likely fill hamstrings from lunges.

**Closes items the existing file left open:**

13. ACSM's at least 10 is **per muscle group per week**, as stated in its full text [1]. That file could only read the abstract.
14. The %1RM of an 8-rep Set at 2 reps in reserve is about 75 to 80% [70], by my interpolation.

## What's weak or uncertain

- **No trial tests a selection rule.** Everything here is inferred from single-variable comparisons. Nobody has tested a Goal-based picker.
- **All tilts and caps are judgement**, including 1.15, 1.25, ± 10%, `ceil(days / 2)`, and one one-sided Exercise a week.
- **The simulation is a model, because no planner exists yet.** There is no `planSession` code in the repo, and I found no spec issue for it. "Full gym" has no tag list in the code, so my proxy for it is every tag I judged a commercial gym has. I assumed:
  - Score = sum of budgeted credit × (Muscle's remaining Budget ÷ its Budget).
  - Each pick adds 3 Sets, each Exercise appears once a Workout, 5 minutes of warm-up, 10 credited Sets per Muscle per day, and no injuries.
  - Target budgets at 4 days.
  - Block sizes of 1 to 4 changed details but not the conclusions. The 3-Set results are the ones shown.
  - Rerun the tests on the real planner before relying on the percentages. Done: see [planner-simulation.md](planner-simulation.md).
- **Credit is a proxy.** It rests on tags, and tags drive picks (the `abs` tag on push-ups, for instance). The 0.5 was validated on a different classification, as the existing file notes.
- **`secondsPerSet` may understate one-sided work.** A one-sided Set is per side, yet one-sided squat-pattern Exercises average 116 seconds against 125 for two-sided, and hinges 105 against 107. If lower-body one-sided Sets really take longer, the one-sided boost costs more time than shown.
- **Energy numbers are rough.** Oxygen measures understate anaerobic work [18], samples are small and mostly young men, and my kcal estimates are arithmetic on single studies. The conclusion is safe only because the gap to diet is so large.
- **Most athletic evidence is from athletes**, often young and male. This app's users differ. Heavy strength's advantage in weaker people comes mainly from one small trial and a review [39, 42].
- **Plyometric dose is uncertain.** The 50 or more jumps per Workout comes from an older analysis [62], and 48 contacts sits just under it. I found no good adult evidence that lower doses work, and no good data on landing injuries in general adult app users.
- **Jump safety data is thin.** The older-adult review has small samples [67], and the ACL review tests multi-part programs in sport [68]. Neither shows that unsupervised jumps from an app are safe. Heavier or inexperienced users may need a careful ladder.
- **Long-term effects are unknown.** Trials run for weeks. Nothing shows what a year of any selection rule does.
- **Motivation may matter more than any of this.** Variety improved motivation [12], and ACSM ranks participation above specific prescription [1]. Selection rules should stay loose enough to let users swap Exercises.

## Verification notes

- **Read in full text via Europe PMC:** ACSM 2026 [1], including the body text on each variable. I searched and read the relevant passages of [3, 13, 18, 26, 43, 49, 70] and did not read them end to end.
- **Could not read:** ACSM's supplemental appendices, or [26]'s supplemental table, except as reported in its text.
- **Abstract only:** every other source, via Europe PMC or Crossref. That includes [2], whose abstract gives no numeric effect, so "trivial" is the authors' word.
- **Figures I could not view:** [70]'s Figure 2. Its repetition estimates come from the Discussion, and the 75 to 80% is my interpolation. Reis's [18] Table 2 was read as extracted text.
- **Conversions to kcal** are mine, using 4.184 kJ per kcal.
- **Search method:** Europe PMC and Crossref, with targeted queries and reference lists such as ACSM's. I did not need general web search. A paper missing from those indexes would have been missed.
- **Searched and not found:**
  - Any meta-analysis directly comparing plyometrics with traditional strength training.
  - Any trial of carries alone on athletic outcomes.
  - Any kettlebell trial with sprint or change-of-direction outcomes.
  - Any trial tying calf raises to sprint or jump.
  - Any Exercise-selection study for recomposition.
  - Any good low-dose plyometric evidence in general adults.
  - Any large meta-analysis on supersets for body composition (a title search returned nothing).
- **Citation checks:**
  - Europe PMC lists [4] as 6(2) and Crossref as 6(1). I cite the DOI, and the existing file's 6(1) matches Crossref.
  - [2] was published online in 2022, in the 2023 volume.
  - Rosa et al. was found through ACSM's reference list, and confirmed by DOI on Crossref.
  - [49] has no volume in Crossref. The citation uses Europe PMC's.
  - Behm and Sale [73] did not appear in Europe PMC's title search and was found on Crossref.
- **Sources reused from the existing file** have new numbers here: [16, 34, 35, 36, 37, 40, 69, 76, 77]. [4] also appears in that file.
- **Preprints:** none used. Two 2026 meta-analyses [13, 49] are very recent and have not been tested by replication or citation. [78] is also 2026.

## Sources

1. Currier BS, D'Souza AC, Singh MAF, et al. American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews. _Med Sci Sports Exerc_. 2026;58(4):851-872. https://doi.org/10.1249/mss.0000000000003897
2. Rosa A, Vazquez G, Grgic J, Balachandran AT, Orazem J, Schoenfeld BJ. Hypertrophic Effects of Single- Versus Multi-Joint Exercise of the Limb Muscles: A Systematic Review and Meta-analysis. _Strength Cond J_. 2023;45(1):49-57. https://doi.org/10.1519/ssc.0000000000000720
3. Kinoshita M, Maeo S, Kobayashi Y, et al. Hypertrophic Effects of Single- versus Multi-Joint Exercise: A Direct Comparison between Knee Extension and Leg Press. _Med Sci Sports Exerc_. 2026;58(7):1566-1580. https://doi.org/10.1249/mss.0000000000003957
4. Gentil P, Soares S, Bottaro M. Single vs. Multi-Joint Resistance Exercises: Effects on Muscle Strength and Hypertrophy. _Asian J Sports Med_. 2015;6(1):e24057. https://doi.org/10.5812/asjsm.24057
5. Paoli A, Gentil P, Moro T, Marcolin G, Bianco A. Resistance Training with Single vs. Multi-joint Exercises at Equal Total Load Volume: Effects on Body Composition, Cardiorespiratory Fitness, and Muscle Strength. _Front Physiol_. 2017;8:1105. https://doi.org/10.3389/fphys.2017.01105
6. Barbalho M, Coswig VS, Raiol R, et al. Does the addition of single joint exercises to a resistance training program improve changes in performance and anthropometric measures in untrained men? _Eur J Transl Myol_. 2018;28(4):7827. https://doi.org/10.4081/ejtm.2018.7827
7. Brandão L, de Salles Painelli V, Lasevicius T, et al. Varying the Order of Combinations of Single- and Multi-Joint Exercises Differentially Affects Resistance Training Adaptations. _J Strength Cond Res_. 2020;34(5):1254-1263. https://doi.org/10.1519/jsc.0000000000003550
8. Haugen ME, Vårvik FT, Larsen S, Haugen AS, van den Tillaar R, Bjørnsen T. Effect of free-weight vs. machine-based strength training on maximal strength, hypertrophy and jump performance. _BMC Sports Sci Med Rehabil_. 2023;15(1):103. https://doi.org/10.1186/s13102-023-00713-4
9. Schwanbeck SR, Cornish SM, Barss T, Chilibeck PD. Effects of Training With Free Weights Versus Machines on Muscle Mass, Strength, Free Testosterone, and Free Cortisol Levels. _J Strength Cond Res_. 2020;34(7):1851-1859. https://doi.org/10.1519/jsc.0000000000003349
10. Kassiano W, Nunes JP, Costa B, Ribeiro AS, Schoenfeld BJ, Cyrino ES. Does Varying Resistance Exercises Promote Superior Muscle Hypertrophy and Strength Gains? A Systematic Review. _J Strength Cond Res_. 2022;36(6):1753-1762. https://doi.org/10.1519/jsc.0000000000004258
11. Fonseca RM, Roschel H, Tricoli V, et al. Changes in exercises are more effective than in loading schemes to improve muscle strength. _J Strength Cond Res_. 2014;28(11):3085-3092. https://doi.org/10.1519/jsc.0000000000000539
12. Baz-Valle E, Schoenfeld BJ, Torres-Unda J, Santos-Concejero J, Balsalobre-Fernández C. The effects of exercise variation in muscle thickness, maximal strength and motivation in resistance trained men. _PLoS One_. 2019;14(12):e0226989. https://doi.org/10.1371/journal.pone.0226989
13. Xin X, Liu Q, Guo Y, et al. Comparative effects of unilateral versus bilateral training on performance adaptations: a systematic review and multilevel meta-analysis. _BMC Sports Sci Med Rehabil_. 2026;18(1):475. https://doi.org/10.1186/s13102-026-01834-2
14. Kassiano W, Tricoli I, Gomes F, et al. Small muscle mass exercise enhances muscular adaptations? Effects of unilateral and bilateral biceps curl on maximum strength and muscle size changes. _Eur J Appl Physiol_. 2026;126(5):2539-2549. https://doi.org/10.1007/s00421-025-06033-4
15. Iversen VM, Norum M, Schoenfeld BJ, Fimland MS. No Time to Lift? Designing Time-Efficient Training Programs for Strength and Hypertrophy: A Narrative Review. _Sports Med_. 2021;51(10):2079-2095. https://doi.org/10.1007/s40279-021-01490-1
16. Robinson ZP, Pelland JC, Remmert JF, et al. Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy. _Sports Med_. 2024;54(9):2209-2231. https://doi.org/10.1007/s40279-024-02069-2
17. Kikuchi N, Nakazato K. Low-load bench press and push-up induce similar muscle hypertrophy and strength gain. _J Exerc Sci Fit_. 2017;15(1):37-42. https://doi.org/10.1016/j.jesf.2017.06.003
18. Reis VM, Garrido ND, Vianna J, Sousa AC, Alves JV, Marques MC. Energy cost of isolated resistance exercises across low- to high-intensities. _PLoS One_. 2017;12(7):e0181311. https://doi.org/10.1371/journal.pone.0181311
19. Robergs RA, Gordon T, Reynolds J, Walker TB. Energy expenditure during bench press and squat exercises. _J Strength Cond Res_. 2007;21(1):123-130. https://doi.org/10.1519/00124278-200702000-00023
20. Farinatti PT, Castinheiras Neto AG. The effect of between-set rest intervals on the oxygen uptake during and after resistance exercise sessions performed with large- and small-muscle mass. _J Strength Cond Res_. 2011;25(11):3181-3190. https://doi.org/10.1519/jsc.0b013e318212e415
21. Kelleher AR, Hackney KJ, Fairchild TJ, Keslacy S, Ploutz-Snyder LL. The metabolic costs of reciprocal supersets vs. traditional resistance exercise in young recreationally active adults. _J Strength Cond Res_. 2010;24(4):1043-1051. https://doi.org/10.1519/jsc.0b013e3181d3e993
22. Falcone PH, Tai CY, Carson LR, et al. Caloric expenditure of aerobic, resistance, or combined high-intensity interval training using a hydraulic resistance system in healthy men. _J Strength Cond Res_. 2015;29(3):779-785. https://doi.org/10.1519/jsc.0000000000000661
23. Farrar RE, Mayhew JL, Koch AJ. Oxygen cost of kettlebell swings. _J Strength Cond Res_. 2010;24(4):1034-1036. https://doi.org/10.1519/jsc.0b013e3181d15516
24. Ratamess NA, Falvo MJ, Mangine GT, Hoffman JR, Faigenbaum AD, Kang J. The effect of rest interval length on metabolic responses to the bench press exercise. _Eur J Appl Physiol_. 2007;100(1):1-17. https://doi.org/10.1007/s00421-007-0394-y
25. Singer A, Wolf M, Generoso L, et al. Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy. _Front Sports Act Living_. 2024;6:1429789. https://doi.org/10.3389/fspor.2024.1429789
26. Ramos-Campo DJ, Andreu Caravaca L, Martínez-Rodríguez A, et al. Effects of Resistance Circuit-Based Training on Body Composition, Strength and Cardiorespiratory Fitness: A Systematic Review and Meta-Analysis. _Biology_. 2021;10(5):377. https://doi.org/10.3390/biology10050377
27. Paoli A, Moro T, Marcolin G, et al. High-Intensity Interval Resistance Training (HIRT) influences resting energy expenditure and respiratory ratio in non-dieting individuals. _J Transl Med_. 2012;10:237. https://doi.org/10.1186/1479-5876-10-237
28. Foster-Schubert KE, Alfano CM, Duggan CR, et al. Effect of diet and exercise, alone or combined, on weight and body composition in overweight-to-obese postmenopausal women. _Obesity_. 2012;20(8):1628-1638. https://doi.org/10.1038/oby.2011.76
29. Miller WC, Koceja DM, Hamilton EJ. A meta-analysis of the past 25 years of weight loss research using diet, exercise or diet plus exercise intervention. _Int J Obes Relat Metab Disord_. 1997;21(10):941-947. https://doi.org/10.1038/sj.ijo.0800499
30. Bellicha A, van Baak MA, Battista F, et al. Effect of exercise training on weight loss, body composition changes, and weight maintenance in adults with overweight or obesity: An overview of 12 systematic reviews and 149 studies. _Obes Rev_. 2021;22(Suppl 4):e13256. https://doi.org/10.1111/obr.13256
31. Donnelly JE, Blair SN, Jakicic JM, et al. American College of Sports Medicine Position Stand. Appropriate physical activity intervention strategies for weight loss and prevention of weight regain for adults. _Med Sci Sports Exerc_. 2009;41(2):459-471. https://doi.org/10.1249/mss.0b013e3181949333
32. Willis LH, Slentz CA, Bateman LA, et al. Effects of aerobic and/or resistance training on body mass and fat mass in overweight or obese adults. _J Appl Physiol_. 2012;113(12):1831-1837. https://doi.org/10.1152/japplphysiol.01370.2011
33. Riou MÈ, Jomphe-Tremblay S, Lamothe G, Stacey D, Szczotka A, Doucet É. Predictors of Energy Compensation during Exercise Interventions: A Systematic Review. _Nutrients_. 2015;7(5):3677-3704. https://doi.org/10.3390/nu7053677
34. Murphy CA, Koehler K. Energy deficiency impairs resistance training gains in lean mass but not strength. _Scand J Med Sci Sports_. 2022;32:125. https://doi.org/10.1111/sms.14075
35. Spiering BA, Mujika I, Sharp MA, Foulis SA. Maintaining Physical Performance: The Minimal Dose of Exercise Needed to Preserve Endurance and Strength Over Time. _J Strength Cond Res_. 2021;35(5):1449-1458. https://doi.org/10.1519/jsc.0000000000003964
36. Wewege MA, Desai I, Honey C, et al. The Effect of Resistance Training in Healthy Adults on Body Fat Percentage, Fat Mass and Visceral Fat. _Sports Med_. 2022;52(2):287-300. https://doi.org/10.1007/s40279-021-01562-2
37. Barakat C, Pearson J, Escalante G, et al. Body Recomposition: Can Trained Individuals Build Muscle and Lose Fat at the Same Time? _Strength Cond J_. 2020;42:7. https://doi.org/10.1519/ssc.0000000000000584
38. Longland TM, Oikawa SY, Mitchell CJ, Devries MC, Phillips SM. Higher compared with lower dietary protein during an energy deficit combined with intense exercise promotes greater lean mass gain and fat mass loss: a randomized trial. _Am J Clin Nutr_. 2016;103(3):738-746. https://doi.org/10.3945/ajcn.115.119339
39. Suchomel TJ, Nimphius S, Bellon CR, Stone MH. The Importance of Muscular Strength: Training Considerations. _Sports Med_. 2018;48(4):765-785. https://doi.org/10.1007/s40279-018-0862-z
40. Suchomel TJ, Nimphius S, Stone MH. The Importance of Muscular Strength in Athletic Performance. _Sports Med_. 2016;46(10):1419-1449. https://doi.org/10.1007/s40279-016-0486-0
41. Seitz LB, Reyes A, Tran TT, Saez de Villarreal E, Haff GG. Increases in lower-body strength transfer positively to sprint performance: a systematic review with meta-analysis. _Sports Med_. 2014;44(12):1693-1702. https://doi.org/10.1007/s40279-014-0227-1
42. Cormie P, McGuigan MR, Newton RU. Adaptations in athletic performance after ballistic power versus strength training. _Med Sci Sports Exerc_. 2010;42(8):1582-1598. https://doi.org/10.1249/mss.0b013e3181d2013a
43. Morris SJ, Oliver JL, Pedley JS, Haff GG, Lloyd RS. Comparison of Weightlifting, Traditional Resistance Training and Plyometrics on Strength, Power and Speed: A Systematic Review with Meta-Analysis. _Sports Med_. 2022;52(7):1533-1554. https://doi.org/10.1007/s40279-021-01627-2
44. Hackett D, Davies T, Soomro N, Halaki M. Olympic weightlifting training improves vertical jump height in sportspeople: a systematic review with meta-analysis. _Br J Sports Med_. 2016;50(14):865-872. https://doi.org/10.1136/bjsports-2015-094951
45. Berton R, Lixandrão ME, Pinto E Silva CM, Tricoli V. Effects of weightlifting exercise, traditional resistance and plyometric training on countermovement jump performance: a meta-analysis. _J Sports Sci_. 2018;36(18):2038-2044. https://doi.org/10.1080/02640414.2018.1434746
46. Wilson GJ, Newton RU, Murphy AJ, Humphries BJ. The optimal training load for the development of dynamic athletic performance. _Med Sci Sports Exerc_. 1993;25(11):1279-1286. https://doi.org/10.1249/00005768-199311000-00013
47. Sáez de Villarreal E, Requena B, Izquierdo M, Gonzalez-Badillo JJ. Enhancing sprint and strength performance: combined versus maximal power, traditional heavy-resistance and plyometric training. _J Sci Med Sport_. 2013;16(2):146-150. https://doi.org/10.1016/j.jsams.2012.05.007
48. Liao KF, Nassis GP, Bishop C, Yang W, Bian C, Li YM. Effects of unilateral vs. bilateral resistance training interventions on measures of strength, jump, linear and change of direction speed: a systematic review and meta-analysis. _Biol Sport_. 2022;39(3):485-497. https://doi.org/10.5114/biolsport.2022.107024
49. Wu B, Yin M, Song Z, et al. Effects of unilateral and bilateral training on performance in team sports athletes: a systematic review and meta-analysis. _Biol Sport_. 2026;43:1019-1039. https://doi.org/10.5114/biolsport.2026.159564
50. Speirs DE, Bennett MA, Finn CV, Turner AP. Unilateral vs. Bilateral Squat Training for Strength, Sprints, and Agility in Academy Rugby Players. _J Strength Cond Res_. 2016;30(2):386-392. https://doi.org/10.1519/jsc.0000000000001096
51. Appleby BB, Cormack SJ, Newton RU. Specificity and Transfer of Lower-Body Strength: Influence of Bilateral or Unilateral Lower-Body Resistance Training. _J Strength Cond Res_. 2019;33(2):318-326. https://doi.org/10.1519/jsc.0000000000002923
52. Lake JP, Lauder MA. Kettlebell swing training improves maximal and explosive strength. _J Strength Cond Res_. 2012;26(8):2228-2233. https://doi.org/10.1519/jsc.0b013e31825c2c9b
53. Lake JP, Lauder MA. Mechanical demands of kettlebell swing exercise. _J Strength Cond Res_. 2012;26(12):3209-3216. https://doi.org/10.1519/jsc.0b013e3182474280
54. Otto WH, Coburn JW, Brown LE, Spiering BA. Effects of weightlifting vs. kettlebell training on vertical jump, strength, and body composition. _J Strength Cond Res_. 2012;26(5):1199-1202. https://doi.org/10.1519/jsc.0b013e31824f233e
55. Manocchia P, Spierer DK, Lufkin AK, Minichiello J, Castro J. Transference of kettlebell training to strength, power, and endurance. _J Strength Cond Res_. 2013;27(2):477-484. https://doi.org/10.1519/jsc.0b013e31825770fe
56. Meigh NJ, Keogh JWL, Schram B, Hing WA. Kettlebell training in clinical practice: a scoping review. _BMC Sports Sci Med Rehabil_. 2019;11:19. https://doi.org/10.1186/s13102-019-0130-z
57. Zebis MK, Skotte J, Andersen CH, et al. Kettlebell swing targets semitendinosus and supine leg curl targets biceps femoris: an EMG study with rehabilitation implications. _Br J Sports Med_. 2013;47(18):1192-1198. https://doi.org/10.1136/bjsports-2011-090281
58. Winwood PW, Cronin JB, Posthumus LR, Finlayson SJ, Gill ND, Keogh JW. Strongman vs. traditional resistance training effects on muscular function and performance. _J Strength Cond Res_. 2015;29(2):429-439. https://doi.org/10.1519/jsc.0000000000000629
59. McGill SM, McDermott A, Fenwick CM. Comparison of different strongman events: trunk muscle activation and lumbar spine motion, load, and stiffness. _J Strength Cond Res_. 2009;23(4):1148-1161. https://doi.org/10.1519/jsc.0b013e318198f8f7
60. Ellestad SH, Holcomb TP, Swiergol AM, Holmstrup ME, Dicus JR. The Quantification of Muscle Activation During the Loaded Carry Movement Pattern. _Int J Exerc Sci_. 2024;17(1):480-490. https://doi.org/10.70252/nwue9985
61. Markovic G. Does plyometric training improve vertical jump height? A meta-analytical review. _Br J Sports Med_. 2007;41(6):349-355. https://doi.org/10.1136/bjsm.2007.035113
62. de Villarreal ES, Kellis E, Kraemer WJ, Izquierdo M. Determining variables of plyometric training for improving vertical jump height performance: a meta-analysis. _J Strength Cond Res_. 2009;23(2):495-506. https://doi.org/10.1519/jsc.0b013e318196b7c6
63. Sáez de Villarreal E, Requena B, Cronin JB. The effects of plyometric training on sprint performance: a meta-analysis. _J Strength Cond Res_. 2012;26(2):575-584. https://doi.org/10.1519/jsc.0b013e318220fd03
64. Asadi A, Arazi H, Young WB, Sáez de Villarreal E. The Effects of Plyometric Training on Change-of-Direction Ability: A Meta-Analysis. _Int J Sports Physiol Perform_. 2016;11(5):563-573. https://doi.org/10.1123/ijspp.2015-0694
65. Makaruk H, Starzak M, Suchecki B, Czaplicki M, Stojiljković N. The Effects of Assisted and Resisted Plyometric Training Programs on Vertical Jump Performance in Adults: A Systematic Review and Meta-Analysis. _J Sports Sci Med_. 2020;19(2):347-357. PMID 32390728. https://pubmed.ncbi.nlm.nih.gov/32390728/
66. Arntz F, Mkaouer B, Markov A, et al. Effect of Plyometric Jump Training on Skeletal Muscle Hypertrophy in Healthy Individuals: A Systematic Review With Multilevel Meta-Analysis. _Front Physiol_. 2022;13:888464. https://doi.org/10.3389/fphys.2022.888464
67. Vetrovsky T, Steffl M, Stastny P, Tufano JJ. The Efficacy and Safety of Lower-Limb Plyometric Training in Older Adults: A Systematic Review. _Sports Med_. 2019;49(1):113-131. https://doi.org/10.1007/s40279-018-1018-x
68. Al Attar WSA, Bakhsh JM, Khaledi EH, Ghulam H, Sanders RH. Injury prevention programs that include plyometric exercises reduce the incidence of anterior cruciate ligament injury: a systematic review of cluster randomised trials. _J Physiother_. 2022;68(4):255-261. https://doi.org/10.1016/j.jphys.2022.09.001
69. Swinton PA, Schoenfeld BJ, Murphy A. Dose-Response Modelling of Resistance Exercise Across Outcome Domains in Strength and Conditioning: A Meta-analysis. _Sports Med_. 2024;54(6):1579-1594. https://doi.org/10.1007/s40279-024-02006-3
70. Nuzzo JL, Pinto MD, Nosaka K, Steele J. Maximal Number of Repetitions at Percentages of the One Repetition Maximum: A Meta-Regression and Moderator Analysis of Sex, Age, Training Status, and Exercise. _Sports Med_. 2024;54(2):303-321. https://doi.org/10.1007/s40279-023-01937-7
71. Pareja-Blanco F, Rodríguez-Rosell D, Sánchez-Medina L, et al. Effects of velocity loss during resistance training on athletic performance, strength gains and muscle adaptations. _Scand J Med Sci Sports_. 2017;27(7):724-735. https://doi.org/10.1111/sms.12678
72. Pareja-Blanco F, Rodríguez-Rosell D, Sánchez-Medina L, Gorostiaga EM, González-Badillo JJ. Effect of movement velocity during resistance training on neuromuscular performance. _Int J Sports Med_. 2014;35(11):916-924. https://doi.org/10.1055/s-0033-1363985
73. Behm DG, Sale DG. Intended rather than actual movement velocity determines velocity-specific training response. _J Appl Physiol_. 1993;74(1):359-368. https://doi.org/10.1152/jappl.1993.74.1.359
74. van Dyk N, Behan FP, Whiteley R. Including the Nordic hamstring exercise in injury prevention programmes halves the rate of hamstring injuries: a systematic review and meta-analysis of 8459 athletes. _Br J Sports Med_. 2019;53(21):1362-1370. https://doi.org/10.1136/bjsports-2018-100045
75. Bautista IJ, Vicente-Mampel J, Baraja-Vegas L, Segarra V, Martín F, Van Hooren B. The effects of the Nordic hamstring exercise on sprint performance and eccentric knee flexor strength: A systematic review and meta-analysis of intervention studies among team sport players. _J Sci Med Sport_. 2021;24(9):931-938. https://doi.org/10.1016/j.jsams.2021.03.009
76. Kinoshita M, Maeo S, Kobayashi Y, et al. Triceps surae muscle hypertrophy is greater after standing versus seated calf-raise training. _Front Physiol_. 2023;14:1272106. https://doi.org/10.3389/fphys.2023.1272106
77. Mannarino P, Matta T, Lima J, et al. Single-Joint Exercise Results in Higher Hypertrophy of Elbow Flexors Than Multijoint Exercise. _J Strength Cond Res_. 2021;35(10):2677-2681. https://doi.org/10.1519/jsc.0000000000003234
78. Zhang C, Wang Q. Effects of standalone plyometric training on vertical jump and linear sprint performance in handball athletes: a systematic review and meta-analysis. _Front Physiol_. 2026;17:1863791. https://doi.org/10.3389/fphys.2026.1863791
79. Nunes H, Fernandes LG, Martins PN, Ferreira RM. The Effects of Nordic Hamstring Exercise on Performance and Injury in the Lower Extremities: An Umbrella Review. _Healthcare_. 2024;12(15):1462. https://doi.org/10.3390/healthcare12151462
