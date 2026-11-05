# Follow-up: Exercise library gaps

Draft of a GitHub issue, not yet opened. It was left out of M5 on 2026-11-04 (grilling Q19). Open it with:

```bash
gh issue create --title "Fill the Exercise library's gaps: jumps, Nordic curl, calf raise, curl" --body-file docs/follow-ups/exercise-library-gaps.md --label needs-triage
```

Delete this header first, and link the M5 spec under **Depends on**.

---

## Problem

The planner can only prescribe what the library holds, and the library of 74 Exercises has gaps that M5's research found. The athletic Goal has no jumps, which is the biggest gap for any Goal. No Exercise has calves as a primary Muscle, and chin-up is the only biceps primary, so these Muscles can't be trained directly.

## Depends on

- The M5 spec (link it here). This work needs its `ballistic` field and the Weekly Budget table.

## Exercises to add

| Priority      | Exercise                                                                               | Goal                   | Why                                                                                                                                          | Notes                                                                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High          | Jumps: squat jump, countermovement jump, broad jump, lateral bound, pogo hop, box jump | athletic               | Plyometrics are among the strongest evidence for sprinting and jumping, and mixed types beat one type. Horizontal jumps help sprinting most. | `ballistic: true`. No 2 reps in reserve target. `avoidWith` knee. A ladder from `bodyweight-squat`. Secondary credit only on quads and glutes, so they add to strength work and don't replace it. |
| Medium        | Nordic hamstring curl                                                                  | athletic               | Halves hamstring injury in athletes (RR 0.49). Small sprint gain, with bias concerns.                                                        | Needs an anchor for the feet, so decide its equipment option.                                                                                                                                     |
| Medium        | Calf raise                                                                             | athletic, build_muscle | Grows calves directly. The link to sprinting or jumping is inference: no trial was found.                                                    | Once it exists, add calves to the Weekly Budget for these Goals at min 4, target 6.                                                                                                               |
| Low to medium | Curl                                                                                   | build_muscle           | Direct biceps work; only a weak case for a budget.                                                                                           | Biceps stay unbudgeted.                                                                                                                                                                           |
| Low           | Overhead triceps extension                                                             | build_muscle           | Only matters for regional growth.                                                                                                            | Triceps have no budget.                                                                                                                                                                           |
| Low           | Knee extension                                                                         | build_muscle           | Only rectus femoris needs it.                                                                                                                | Requires a machine or cable.                                                                                                                                                                      |

**Don't add:** Olympic lifts (hard to teach from a phone, and jumps match them), fixed machines (no size difference), or more carries (very low evidence).

## Decisions this issue needs

1. **Are unsupervised jumps safe enough to prescribe?** The research found no evidence either way for jumps prescribed from an app. Decide on any screening, such as `avoidWith`, age or body weight, or an opt-in. Settle this before any jump ships.
2. **How does a jump fit the Working Level?** A Working Level means reps at a load, and a Set assumes 2 reps in reserve. Jumps have neither. The dose is contacts, so also decide how the Week Ledger credits them.
3. **How are jumps prescribed?** The research suggests starting 2 Workouts a week with 2 jump Exercises of 3 Sets each: 48 contacts, just under the 50 or more per Workout linked to better gains. It adds about 15 minutes a week (an estimate), which the delivery figures don't include.
4. **Does the Bodyweight only gap need fixing too?** Only 21 Exercises need no equipment, and just one of those is a pull (`prone-ytw`). None trains lats, so Alternative Exercises for back work are thin, and M5 drops an Exercise with no match. 9 Exercises have no bodyweight alternative with the same Pattern and a shared primary Muscle. Consider a table row, which uses the `table` tag.

## Done when

- Each chosen Exercise is in `EXERCISES` with its Muscles, Patterns, `equipmentOptions`, ladder links, `avoidWith` and cues, and `STRENGTH_RATIOS` has an entry for it. The ratio table has one entry per library Exercise.
- The Exercises appear in Planned Workouts for the Goals above.
- Calves are in the Weekly Budget table if the calf raise ships.
- Exercises with `ballistic` that are new to the library are tagged, and are placed first in an athletic Workout.

## Evidence

- `docs/research/exercise-selection-by-goal.md`, "Q6. Library gaps by Goal"
- `docs/research/weekly-budget-volume.md`, calves and biceps challenges
