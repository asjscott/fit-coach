# Progression and deload: checking the M6 rules

Research for M6 Progression. Written 2026-11-10. It checks each rule in [ADR 0007](../adr/0007-progression-and-deload.md) and the roadmap's "Settled before the spec" against primary sources. Companions: `weekly-budget-volume.md` (how many Sets) and `exercise-selection-by-goal.md` (which Exercises).

**Vocabulary.** Terms follow `GLOSSARY.md`. In this repo Volume means kg × reps, so set counts are **weekly Sets**. A paper's "session" is a Workout here. **RM** is a repetition maximum: a 10RM is the heaviest load for 10 reps. **RIR** is reps in reserve; RPE 10 is 0 RIR, RPE 9 is 1 RIR, on the RIR-based scale [23, 24]. **e1RM** is an estimated one-rep maximum. **Load Step ratio** is the next load divided by the current one, so 25 to 30 lb is 1.2.

## Summary

- **Most rules hold.** Rep ranges, +1 rep progression, the Miss threshold, last-Set RPE and Epley PRs all sit inside what the evidence supports, or where it is silent.
- **The biggest problem is arithmetic, not physiology.** The roadmap calls one Load Step "about 10%". For light dumbbells and kettlebells it is 20 to 50%. After a jump that big, someone who did 12 reps can only do about 4 to 6, which is a Miss. Two of those drop the load again, and the Exercise can bounce between two loads for good. See [Q1](#q1-double-progression).
- **Ballistic Exercises progress too fast.** Swings and jumps are done well short of failure, so every Set reaches 8 almost every time. Under the rule, load goes up every Workout until the user fails to get 8, which is the near-failure fatigue the fixed 8 was meant to avoid. See [Q7](#q7-ballistic-exercises).
- **The deload is a reasonable choice with almost no direct evidence.** Experts agree a deload can cut load, cut Sets, or both, planned or as needed [14]. The one trial found a week off cost a little strength and no muscle [17]. Nothing compares "same Sets, lighter load" with "fewer Sets, same load".
- **RPE is weakest where it matters least.** People misjudge reps left by about 1 on average, more on high-rep Sets [22]. They are more accurate close to failure, which is where RPE 10 sits. As a brake, holding on RPE 10 is sound.
- **Epley e1RM is fine for PRs.** No equation is best across exercises and sexes [25, 27, 28]. Its error is mostly a fixed bias per Exercise, which cancels when a PR compares an Exercise with itself. Ballistic Exercises and carries should not get e1RM PRs.

## Verdict per rule

| #   | Rule                                              | Verdict                         | Support        |
| --- | ------------------------------------------------- | ------------------------------- | -------------- |
| 1   | Rep ranges 8–12, 6–10 barbell, 10–15 band         | Holds                           | Moderate       |
| 1   | +1 rep per Workout; Load Step at the top          | Holds, **change for big steps** | Moderate / Low |
| 2   | Bodyweight to 15 reps, timed to 60 s, then harder | Holds                           | Low / Very low |
| 3   | Miss at >2 reps short; two drop one Load Step     | Holds, **change for big steps** | Low            |
| 4   | 5-week Block, deload: same Sets, loads −10%       | Holds                           | Low / Very low |
| 5   | Optional last-Set RPE; RPE 10 holds               | Holds                           | Moderate       |
| 6   | Epley e1RM PRs on Sets of ≤12 reps                | Holds, **exclude Ballistic**    | Moderate       |
| 7   | Ballistic: fixed 8 reps, load only                | 8 holds; **gate the step**      | Low            |

**Support ratings.** _High_: several meta-analyses or a position stand agree. _Moderate_: one strong analysis or several trials. _Low_: indirect or a few small studies. _Very low_: judgement.

## Q1. Double progression

### Rep ranges

| Claim                                                                  | Number                       | Support  | Source |
| ---------------------------------------------------------------------- | ---------------------------- | -------- | ------ |
| Novices should train with 8–12RM loads                                 | 8–12RM                       | High     | [1]    |
| Hypertrophy: 1–12RM, emphasis on 6–12RM                                | 6–12RM                       | High     | [1]    |
| Hypertrophy is similar across loads when Sets go to failure            | ≤60% vs >60% 1RM, 21 studies | Moderate | [2]    |
| Same for low (>15RM), moderate (9–15RM) and high (≤8RM) loads          | 28 studies, 747 people       | Moderate | [3]    |
| 1RM strength gains are larger with heavier loads                       | SMD 0.60–0.63 high vs low    | Moderate | [3]    |
| Hypertrophy grows as Sets end closer to failure; strength barely cares | exploratory meta-regression  | Low      | [5]    |
| Failure vs non-failure: trivial difference for hypertrophy             | ES 0.19 (0.00 to 0.37)       | Moderate | [6]    |

8–12 is ACSM's novice range word for word [1]. 6–10 for barbell lifts leans heavier, where strength benefits [1, 3]. 10–15 for bands fits, because growth holds at higher reps when Sets are hard [2, 3]. All three hold.

One caution. The ranges in the papers are RM loads, Sets to or near failure. M6's targets are reps done, usually short of failure. So "8 reps" in the app is lighter than an 8RM. That is fine for hypertrophy, which tolerates a wide band of load and effort [3, 6]. It is judgement that it costs little strength.

### Adding reps, then load

| Claim                                                          | Number                                              | Support  | Source |
| -------------------------------------------------------------- | --------------------------------------------------- | -------- | ------ |
| Adding reps at a fixed load works about as well as adding load | squat 1RM +21.8 vs +19.3 kg; thickness within ~1 mm | Low      | [4]    |
| Raise load when the user beats the target by 1–2 reps          | +2–10% load                                         | High     | [1]    |
| Reps at a %1RM vary by exercise                                | 80% 1RM: bench 8.8, leg press 13.1 reps             | Moderate | [8]    |
| Between-person spread in reps                                  | SD 2.51 reps at 80% 1RM                             | Moderate | [8]    |

Plotkin's trial is the closest test of M6's idea. Trained adults, 8 weeks, 4 Sets of 8–12 to failure; one group added load, one added reps [4]. Both worked. That supports a rep target that climbs, and suggests letting reps climb further is safe when load can't.

**The Load Step problem.** ACSM's step is 2–10% [1]. A barbell with 2.5 kg plates is about that. Fixed dumbbells and kettlebells are not:

| Step                                       | Ratio | Reps predicted at the new load after 12 reps (to failure / at 2 RIR) |
| ------------------------------------------ | ----- | -------------------------------------------------------------------- |
| barbell 60 → 65 kg                         | 1.08  | 8.8 / 10.6                                                           |
| dumbbell 35 → 40 lb                        | 1.14  | 6.7 / 8.5                                                            |
| dumbbell 25 → 30 lb                        | 1.20  | 5.0 / 6.7                                                            |
| dumbbell 20 → 25 lb; kettlebell 16 → 20 kg | 1.25  | 3.6 / 5.2                                                            |
| dumbbell 15 → 20 lb; kettlebell 12 → 16 kg | 1.33  | 1.5 / 3.0                                                            |

My arithmetic, using Epley: reps = 30 × (e1RM / new load − 1). A Miss is more than 2 short of 8, so fewer than 6. Every step of about 1.2 or more lands on or past a Miss. Two Misses then drop one Load Step, back to the old load at the bottom of the range, and the cycle repeats. The barbell 6–10 range has the same edge: an empty 20 kg bar to 25 kg (1.25) predicts 2 to 3.6 reps against a bottom of 6.

Nuzzo's data says Epley isn't far off here. Bench press at 80% and 70% 1RM gave 8.8 and 14.1 reps [8], about 5 reps per 10% of 1RM. Leg press gave more reps at each load [8], so lower-body machines would drop less.

**Recommended change.** Step up only when the reps predicted at the next load reach the bottom of the range. Until then, let the target climb past the top, as the "Load ceilings" rule already does, up to 20. Then:

- Step when `30 × ((1 + reps / 30) × current / next − 1) ≥ bottom`, every Set, from the lowest Set's reps.
- The new target is that prediction, rounded down, not the bottom of the range.
- At a ratio of 1.10 or less, this is the ADR's rule unchanged. At 1.2 (25 → 30 lb), the step comes at 16 reps. At 1.25 it comes at 18. At 1.33 it needs 21, so it falls to the 20-rep ceiling rule.

High-rep Sets near failure grow muscle as well as low-rep ones [2, 3], so the extra reps cost little for hypertrophy. They cost some strength [3]. Support: Low. The rule is arithmetic on a formula, checked against one meta-regression.

## Q2. Bodyweight and timed ladders

| Claim                                                                     | Number                   | Support  | Source |
| ------------------------------------------------------------------------- | ------------------------ | -------- | ------ |
| Push-ups at a load like 40% 1RM bench grew muscle and strength like bench | 8 weeks, 2×/week, n = 18 | Low      | [13]   |
| Progressing push-up variants raised bench 1RM like bench training         | 4 weeks, n = 23          | Low      | [12]   |
| Sets of more than 15 reps to failure grow muscle like heavier ones        | >15RM vs ≤8RM            | Moderate | [3]    |
| Rep predictions are less accurate above 12 reps                           | β 0.47 vs 0.06           | Moderate | [22]   |
| ACSM's endurance range                                                    | >15 reps, 40–60% 1RM     | High     | [1]    |

+1 rep per Workout up to 15, then a harder variant, holds. Moving up the ladder is how Kotarsky's group progressed, and it worked [12]. A cap at 15 keeps bodyweight Sets inside the hypertrophy range [1, 3] and keeps reps where self-judgement is better [22]. A higher cap, such as 20, would also be defensible [3]. 15 is judgement.

**Timed holds: no evidence found.** I found no trial of hold length for planks or similar. +5 s up to 60 s, then harder, is judgement. Support: Very low.

The harder variant has its own Load Step problem: the jump in difficulty is unknown, and its Working Level comes from Reference Strength, not from the easier variant's reps. Two Misses lower its target 2 reps, so it can't loop like Q1. It holds.

## Q3. Misses and stalls

| Claim                                                                | Number                              | Support | Source |
| -------------------------------------------------------------------- | ----------------------------------- | ------- | ------ |
| Week-to-week retest error in reps to failure                         | SEM 0.7 reps at 90%, 1.1 at 70% 1RM | Low     | [9]    |
| Reliability of reps to failure                                       | ICC 0.65 at 90%, 0.86 at 70%        | Low     | [9]    |
| Autoregulating to daily performance builds strength at least as well | 14 studies                          | Low     | [10]   |
| RPE-chosen loads matched or slightly beat %1RM loads                 | small ES advantage                  | Low     | [11]   |

Mitter's SEM of about 1 rep means a single Set's smallest real change is about 2 to 3 reps (1.96 × √2 × SEM, my arithmetic) [9]. That is for one Set to failure, in trained people, one week apart. An average over 2 or more Sets is less noisy. So "more than 2 reps short on average" sits just above noise, and requiring two in a row makes a false drop rare. **The Miss threshold holds.** Support: Low.

The autoregulation literature [10, 11] says daily performance varies enough to matter, and that adjusting to it doesn't hurt. M6 adjusts only after the fact, by reps. That is a milder form, and nothing says it is worse. Judgement.

**Two problems, both from Q1's Load Step.**

- A Miss right after a step up is the step's fault, not a stall. With the Q1 change it mostly disappears. Without it, the first Workout after a step up shouldn't count as a Miss.
- A drop of one Load Step is "about 10%" only on a barbell. On a 15 lb dumbbell it is 25%. **Recommended change:** when one Load Step down is more than about 12%, keep the load and lower the target 2 reps, as for bodyweight. Drop the load only when the target is already at the bottom of the range. Support: Very low (judgement).

## Q4. The deload week

| Claim                                                                  | Number                                     | Support  | Source |
| ---------------------------------------------------------------------- | ------------------------------------------ | -------- | ------ |
| A deload may cut Sets, reps, load or proximity to failure              | 85–100% expert agreement                   | Low      | [14]   |
| Deloads may be planned, as-needed or both                              | 100% agreement                             | Low      | [14]   |
| No consensus on how often                                              | none reached                               | Low      | [14]   |
| Athletes deload about every 5.6 weeks, for about 6 days                | 5.6 ± 2.3 weeks, 6.4 ± 1.7 days, n = 246   | Low      | [15]   |
| They cut Sets, reps and load, and stop further from failure            | survey                                     | Low      | [15]   |
| Coaches most often cut volume and intensity by 0–25%                   | n = 204                                    | Low      | [16]   |
| A week off at week 5 of 9 cost a little strength, no muscle            | squat 1RM −3.6 kg (−10.4 to 3.2), P = 0.85 | Low      | [17]   |
| 3 weeks off every 6 gave the same 24-week growth as nonstop training   | untrained, n = 14                          | Low      | [18]   |
| Stopping training lowers strength, more the longer it lasts            | maximal force SMD −0.46                    | Moderate | [19]   |
| 3.5–5.5 days off after 4 weeks raised jump and bench force             | n = 8                                      | Low      | [20]   |
| A taper with ~70% less volume improved jump; higher load tended better | n = 11                                     | Low      | [21]   |

**Does a deload help at all?** No trial shows a benefit for muscle. Coleman's is the only RCT, in trained people doing about 90 weekly Sets to failure. A full week off cost a little strength and nothing else [17]. M6's users do far fewer Sets, not to failure, so they carry less fatigue. That makes a benefit less likely and a cost smaller.

**Every 5 weeks** sits inside what athletes report, 5.6 ± 2.3 [15]. The panel set no frequency [14]. It holds as a schedule. Support: Very low. It also gives the retest a home.

**Same Sets, 10% lighter.** At the same target reps, 10% lighter is a lot further from failure. Someone at 2 RIR on 10 reps would have about 7 RIR (my arithmetic, Epley). The panel agreed a deload can be just that: less load, less effort, Sets unchanged [14]. Practice usually cuts both [15, 16]. Taper studies cut Sets and keep load, and found keeping load slightly better for strength and power [21]. That favours "fewer Sets, same load" for strength, but the trial was 11 people and the difference wasn't significant.

**Alternatives.**

| Option                   | For                                                          | Against                                              |
| ------------------------ | ------------------------------------------------------------ | ---------------------------------------------------- |
| Same Sets, −10% (M6)     | Keeps habit and the Week Ledger whole; panel accepts it [14] | No trial; keeps Workout time                         |
| Half the Sets, same load | Taper evidence [21]; shorter Workouts                        | Breaks the Weekly Budget for a week; ADR rejected it |
| As needed only           | Panel accepts it [14]; no lost weeks                         | Needs a fatigue signal the app doesn't trust yet     |
| No deload                | Coleman: the break didn't help [17]                          | No retest slot; no relief for joints or motivation   |

**Verdict: holds.** It is one of several accepted designs, and nothing shows another is better for this user. The 70% for bodyweight, band and timed targets has no source. It matches the size of Pritchard's volume cut [21] only by coincidence. Support: Very low.

## Q5. Last-Set RPE

| Claim                                                       | Number                               | Support  | Source |
| ----------------------------------------------------------- | ------------------------------------ | -------- | ------ |
| People underpredict reps left                               | by 0.95 reps (0.17 to 1.73)          | Moderate | [22]   |
| Accuracy is better close to failure and at ≤12 reps         | β 0.06 at ≤12 vs 0.47 at >12 reps    | Moderate | [22]   |
| Later Sets are slightly more accurate                       | β −0.07 reps                         | Moderate | [22]   |
| Training status did not change accuracy                     | β −0.006                             | Moderate | [22]   |
| Novices rated a true 1RM lower than experienced lifters did | n = 29                               | Low      | [23]   |
| RPE and bar speed track each other                          | r = −0.88 experienced, −0.77 novices | Low      | [23]   |

Halperin's pooled studies had very high heterogeneity, and the authors say it is not yet known if this error is acceptable [22].

**Last Set only holds.** Later Sets are rated slightly better [22], and one rating per Exercise keeps logging quick, which is the ADR's reason.

**RPE 10 holds both load and target: holds.** An RPE 10 is close to failure, where ratings are most accurate [22]. Underprediction means a logged 10 may really be a 9 [22]; holding then is cautious, not wrong. Novices may log 9 at a true 10 [23], so the brake will sometimes not fire. The reps still catch that next time, through a Miss. Support: Moderate for the accuracy findings, Low for the rule.

Not recommended: progressing faster on a low RPE. Ratings far from failure are the least accurate [22].

## Q6. PRs by Epley e1RM

| Claim                                                      | Number                                                               | Support  | Source |
| ---------------------------------------------------------- | -------------------------------------------------------------------- | -------- | ------ |
| 7 equations correlated well with 1RM, but most were biased | r > 0.95; all underestimated deadlift                                | Low      | [25]   |
| Linear 1RM equations should use 10 reps or fewer           | bench and leg press, n = 70                                          | Low      | [26]   |
| Equations were more accurate below 10 reps to failure      | women, bench, n = 103                                                | Low      | [27]   |
| The best equation differs by lift and sex                  | Lombardi for men's bench and squat; Brzycki, Brown, Lander for women | Low      | [28]   |
| Reps at a given %1RM differ by exercise                    | 80%: bench 8.8, leg press 13.1                                       | Moderate | [8]    |

Epley versus Brzycki, as each is commonly written, `1 + r/30` and `36 / (37 − r)`. My arithmetic:

| Reps | Epley | Brzycki | Epley higher by |
| ---- | ----- | ------- | --------------- |
| 5    | 1.167 | 1.125   | 3.7%            |
| 8    | 1.267 | 1.241   | 2.0%            |
| 10   | 1.333 | 1.333   | 0%              |
| 12   | 1.400 | 1.440   | −2.8%           |

The two differ by under 4% from 1 to 12 reps. No source I read found one clearly better [25, 28]. Against Nuzzo's averages, Epley overestimates bench e1RM by about 3% and leg press by about 15% [8]. That error is mostly the same at 8 and at 13 reps on a given exercise. A PR compares an Exercise with itself, so a fixed bias cancels. **Epley holds.**

**≤12 reps holds.** Two studies point to 10 or fewer for best accuracy [26, 27]. A cap of 10 would ignore the top of the 8–12 range, where many Sets will land. For a PR, consistency matters more than accuracy. Support: Moderate.

**Two consequences to know.**

- Epley assumes reps to failure. M6's Sets usually stop short, so every e1RM is low by the reps left. That is a fixed bias too, so it is fine for PRs. It is not fine for setting loads, and the e1RM shouldn't feed Reference Strength.
- Each extra rep at the same load raises e1RM by 3.3% of the load. Under double progression, nearly every Workout that adds a rep is a PR, and a Load Step is not. Expect PRs to be frequent.

**Recommended change.** No e1RM PRs for Ballistic Exercises. Their Sets of 8 are far from failure by design, so e1RM means nothing there. Use the heaviest load for 8 reps instead. Carries already sit outside double progression and should be outside e1RM PRs too; the roadmap doesn't say. Support: Very low (judgement).

## Q7. Ballistic Exercises

| Claim                                                                | Number                                  | Support  | Source |
| -------------------------------------------------------------------- | --------------------------------------- | -------- | ------ |
| Power: light loads moved fast, 3–5 Sets                              | 0–60% 1RM lower body, 30–60% upper      | High     | [1]    |
| Stopping at 20% velocity loss beat 40% for jumping                   | CMJ +9.5% vs +3.5%, with 40% fewer reps | Low      | [29]   |
| More velocity loss hurts jump and sprint gains, helps hypertrophy    | CMJ b = −0.040                          | Moderate | [30]   |
| Kettlebell swing training raised squat 1RM and jump like jump squats | +9.8% half squat, +19.8% jump, 6 weeks  | Low      | [31]   |

The companion doc already checked 8 reps against ACSM's 2026 power volume of 24 or fewer reps per Exercise, and against swing trials of 4 to 10 reps ([exercise-selection-by-goal.md](exercise-selection-by-goal.md#what-survives-8-reps)). **A fixed 8 holds.** Support: Low.

**Progressing by load only holds; the trigger doesn't.** "Every Set reaches 8" is almost always true for a swing, since the Sets are not near failure. So load goes up every Workout until the user can't do 8. The evidence is clear that fatigue within a Set hurts power gains [29, 30]. The rule climbs exactly into that zone. Kettlebell steps of 4 kg are 20 to 33% at common weights, so a user could go 12 → 16 → 20 → 24 kg in three Workouts.

**Recommended change.** Step a Ballistic Exercise up only when its last-Set RPE is logged at 7 or lower, with all 8 reps. Without an RPE, step at most once every 3 Workouts at the same load. An RPE of 9 or 10 on a Ballistic Exercise should also hold. The thresholds are judgement. Support: Very low for the numbers, Moderate for the reason [30].

Bodyweight jumps not progressing on their own holds. Jumps are already near zero external load, at the light end of ACSM's power range [1].

## Conflicts with decisions already made

1. **"One Load Step (about 10%)" (roadmap, Miss and drop).** True for barbells. False for fixed dumbbells under about 35 lb and kettlebells under 24 kg, where it is 14 to 50%. This is the largest conflict.
2. **"One Load Step up and back to the bottom of the range" (ADR 0007, roadmap).** On steps of about 1.2 or more, the user can't reach the bottom; the first Workout is a Miss and two drop the load back. Change to the predicted-reps step in [Q1](#q1-double-progression).
3. **"Two Misses in a row … drop it one Load Step" (ADR 0007).** A step down can be 25 to 50%. Lower the target 2 reps first when the step down is more than about 12% ([Q3](#q3-misses-and-stalls)).
4. **"A weighted one goes up a Load Step when every Set reaches 8" (roadmap, Ballistic Exercises).** Steps nearly every Workout and drives Sets toward failure. Gate it on RPE or time ([Q7](#q7-ballistic-exercises)).
5. **"A new best estimated 1RM … for a loaded Exercise" (roadmap, PRs; Glossary PR).** Includes Ballistic Exercises and doesn't exclude carries. Use heaviest load for 8 reps for Ballistic Exercises; exclude carries ([Q6](#q6-prs-by-epley-e1rm)).
6. **RPE 10 wording differs.** ADR 0007 says RPE 10 "holds both" load and target. The roadmap says it "holds the load where it is". The evidence supports the ADR. The roadmap line should match.
7. **ADR 0007 rejected "halve the Sets, keep loads"** as the user's choice. The taper data mildly favours that option for strength [21]. Not strong enough to reopen; noted.

No conflict with: the rep ranges, +1 rep progression, the Miss threshold, two-in-a-row, the 5-week Block, last-Set RPE, the 15-rep and 60-second ladders, or Epley with a 12-rep cap.

## What's weak or uncertain

- **Most of this is judgement on top of thin evidence.** No trial tests double progression against another scheme in general adults. Plotkin's [4] is the closest, and it is 38 trained people for 8 weeks on legs.
- **The Load Step arithmetic rests on Epley.** It assumes Sets to failure, and real reps per %1RM vary between people (SD 2.51 reps at 80% [8]) and by exercise [8]. The predicted reps could be off by 1 or 2. The direction of the finding (big steps cause Misses) is robust; the exact thresholds are not.
- **Day-to-day variation is from one small study** [9] of bench press in trained people, a week apart. I found nothing on rep variation in novices or on dumbbell and bodyweight Exercises.
- **Deload evidence is mostly opinion.** One Delphi [14], two surveys [15, 16], one RCT of complete rest in trained people doing far more Sets than our users [17]. Nothing tests a lighter-load deload against anything.
- **Timed holds and band steps have no evidence.** 60 s, +5 s and the band ladder are judgement.
- **RPE studies mostly use squat and bench**, often near 1RM [22, 23]. Our users rate dumbbell and machine Sets of 8 to 15 reps.
- **Ballistic gating thresholds** (RPE 7, every 3 Workouts) are mine.

## Verification notes

- **Read in full text (PMC):** Plotkin [4], Coleman [17]. Bell [14] in part: the first two-thirds, which held the results tables. Nuzzo [8] in part: Results and Discussion text, not Figure 2 or its prediction intervals.
- **Abstract only** (Europe PMC, OpenAlex or DOAJ): every other source. PeerJ's site returned 403, so Plotkin and Coleman were read on PMC.
- **LeSuer [25]:** the abstract names no equation as best, and the journal page was paywalled. I could not check which equations it tested by name.
- **Epley and Brzycki formulas** are as commonly written and as ADR 0007 states Epley. I did not open their original publications.
- **Pelland [7]** was published online in 2025, in Sports Medicine 56(2), 2026, not 2024. It is about weekly Sets and frequency, not progression; cited here only for that.
- **Not found:** a Pritchard taper review from 2015; any trial of hold-length progression; any trial comparing deload designs with each other; any trial of double progression against linear or percentage progression in general adults.
- **Searched and not used:** a 2026 arXiv preprint fitting a 1RM equation to app data (not peer reviewed, and it doesn't name the equations it beat).
- **Arithmetic** in the Load Step, Epley-versus-Brzycki and RIR examples is mine.

## Sources

1. American College of Sports Medicine. American College of Sports Medicine position stand. Progression models in resistance training for healthy adults. _Med Sci Sports Exerc_. 2009;41(3):687-708. https://doi.org/10.1249/mss.0b013e3181915670
2. Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW. Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-analysis. _J Strength Cond Res_. 2017;31(12):3508-3523. https://doi.org/10.1519/jsc.0000000000002200
3. Lopez P, Radaelli R, Taaffe DR, et al. Resistance Training Load Effects on Muscle Hypertrophy and Strength Gain: Systematic Review and Network Meta-analysis. _Med Sci Sports Exerc_. 2021;53(6):1206-1216. https://doi.org/10.1249/mss.0000000000002585
4. Plotkin D, Coleman M, Van Every D, et al. Progressive overload without progressing load? The effects of load or repetition progression on muscular adaptations. _PeerJ_. 2022;10:e14142. https://doi.org/10.7717/peerj.14142
5. Robinson ZP, Pelland JC, Remmert JF, et al. Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions. _Sports Med_. 2024;54(9):2209-2231. https://doi.org/10.1007/s40279-024-02069-2
6. Refalo MC, Helms ER, Trexler ET, Hamilton DL, Fyfe JJ. Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis. _Sports Med_. 2023;53(3):649-665. https://doi.org/10.1007/s40279-022-01784-y
7. Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC. The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains. _Sports Med_. 2026;56(2):481-505. https://doi.org/10.1007/s40279-025-02344-w
8. Nuzzo JL, Pinto MD, Nosaka K, Steele J. Maximal Number of Repetitions at Percentages of the One Repetition Maximum: A Meta-Regression and Moderator Analysis of Sex, Age, Training Status, and Exercise. _Sports Med_. 2024;54(2):303-321. https://doi.org/10.1007/s40279-023-01937-7
9. Mitter B, Csapo R, Bauer P, Tschan H. Reproducibility of strength performance and strength-endurance profiles: A test-retest study. _PLoS One_. 2022;17(5):e0268074. https://doi.org/10.1371/journal.pone.0268074
10. Larsen S, Kristiansen E, van den Tillaar R. Effects of subjective and objective autoregulation methods for intensity and volume on enhancing maximal strength during resistance-training interventions: a systematic review. _PeerJ_. 2021;9:e10663. https://doi.org/10.7717/peerj.10663
11. Helms ER, Byrnes RK, Cooke DM, et al. RPE vs. Percentage 1RM Loading in Periodized Programs Matched for Sets and Repetitions. _Front Physiol_. 2018;9:247. https://doi.org/10.3389/fphys.2018.00247
12. Kotarsky CJ, Christensen BK, Miller JS, Hackney KJ. Effect of Progressive Calisthenic Push-up Training on Muscle Strength and Thickness. _J Strength Cond Res_. 2018;32(3):651-659. https://doi.org/10.1519/jsc.0000000000002345
13. Kikuchi N, Nakazato K. Low-load bench press and push-up induce similar muscle hypertrophy and strength gain. _J Exerc Sci Fit_. 2017;15(1):37-42. https://doi.org/10.1016/j.jesf.2017.06.003
14. Bell L, Strafford BW, Coleman M, Androulakis Korakakis P, Nolan D. Integrating Deloading into Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach. _Sports Med Open_. 2023;9(1):87. https://doi.org/10.1186/s40798-023-00633-0
15. Rogerson D, Nolan D, Androulakis Korakakis P, et al. Deloading Practices in Strength and Physique Sports: A Cross-sectional Survey. _Sports Med Open_. 2024;10(1):26. https://doi.org/10.1186/s40798-024-00691-y
16. De Marco K, Goods PSR, Baldwin KM, Hiscock DJ, Scott BR. Resistance Training Prescription During Planned Deloading Periods: A Survey of Strength and Conditioning Coaches Across Varying Sporting Codes. _J Strength Cond Res_. 2024;38(12):2099-2106. https://doi.org/10.1519/jsc.0000000000004932
17. Coleman M, Burke R, Augustin F, et al. Gaining more from doing less? The effects of a one-week deload period during supervised resistance training on muscular adaptations. _PeerJ_. 2024;12:e16777. https://doi.org/10.7717/peerj.16777
18. Ogasawara R, Yasuda T, Ishii N, Abe T. Comparison of muscle hypertrophy following 6-month of continuous and periodic strength training. _Eur J Appl Physiol_. 2013;113(4):975-985. https://doi.org/10.1007/s00421-012-2511-9
19. Bosquet L, Berryman N, Dupuy O, et al. Effect of training cessation on muscular performance: a meta-analysis. _Scand J Med Sci Sports_. 2013;23(3):e140-e149. https://doi.org/10.1111/sms.12047
20. Pritchard HJ, Barnes MJ, Stewart RJC, Keogh JWL, McGuigan MR. Short-Term Training Cessation as a Method of Tapering to Improve Maximal Strength. _J Strength Cond Res_. 2018;32(2):458-465. https://doi.org/10.1519/jsc.0000000000001803
21. Pritchard HJ, Barnes MJ, Stewart RJ, Keogh JW, McGuigan MR. Higher- Versus Lower-Intensity Strength-Training Taper: Effects on Neuromuscular Performance. _Int J Sports Physiol Perform_. 2019;14(4):458-463. https://doi.org/10.1123/ijspp.2018-0489
22. Halperin I, Malleron T, Har-Nir I, et al. Accuracy in Predicting Repetitions to Task Failure in Resistance Exercise: A Scoping Review and Exploratory Meta-analysis. _Sports Med_. 2022;52(2):377-390. https://doi.org/10.1007/s40279-021-01559-x
23. Zourdos MC, Klemp A, Dolan C, et al. Novel Resistance Training-Specific Rating of Perceived Exertion Scale Measuring Repetitions in Reserve. _J Strength Cond Res_. 2016;30(1):267-275. https://doi.org/10.1519/jsc.0000000000001049
24. Helms ER, Cronin J, Storey A, Zourdos MC. Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training. _Strength Cond J_. 2016;38(4):42-49. https://doi.org/10.1519/ssc.0000000000000218
25. LeSuer DA, McCormick JH, Mayhew JL, Wasserstein RL, Arnold MD. The Accuracy of Prediction Equations for Estimating 1-RM Performance in the Bench Press, Squat, and Deadlift. _J Strength Cond Res_. 1997;11(4):211-213. https://doi.org/10.1519/00124278-199711000-00001
26. Reynolds JM, Gordon TJ, Robergs RA. Prediction of one repetition maximum strength from multiple repetition maximum testing and anthropometry. _J Strength Cond Res_. 2006;20(3):584-592. https://doi.org/10.1519/r-15304.1
27. Mayhew JL, Johnson BD, Lamonte MJ, Lauber D, Kemmler W. Accuracy of prediction equations for determining one repetition maximum bench press in women before and after resistance training. _J Strength Cond Res_. 2008;22(5):1570-1577. https://doi.org/10.1519/jsc.0b013e31817b02ad
28. Ribeiro A, da Silva JA, Nascimento M, et al. Accuracy of 1RM Prediction Equations Before and After Resistance Training in Three Different Lifts. _Int J Strength Cond_. 2024;4(1). https://doi.org/10.47206/ijsc.v4i1.327
29. Pareja-Blanco F, Rodríguez-Rosell D, Sánchez-Medina L, et al. Effects of velocity loss during resistance training on athletic performance, strength gains and muscle adaptations. _Scand J Med Sci Sports_. 2017;27(7):724-735. https://doi.org/10.1111/sms.12678
30. Jukic I, Castilla AP, Ramos AG, et al. The Acute and Chronic Effects of Implementing Velocity Loss Thresholds During Resistance Training: A Systematic Review, Meta-Analysis, and Critical Evaluation of the Literature. _Sports Med_. 2023;53(1):177-214. https://doi.org/10.1007/s40279-022-01754-4
31. Lake JP, Lauder MA. Kettlebell swing training improves maximal and explosive strength. _J Strength Cond Res_. 2012;26(8):2228-2233. https://doi.org/10.1519/jsc.0b013e31825c2c9b
