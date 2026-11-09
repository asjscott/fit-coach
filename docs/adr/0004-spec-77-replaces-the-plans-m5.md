# Spec #77 replaces the Build plan's M5

The Build plan is a PDF outside the repo, and it still describes the M5 designed before the spec's research and grilling. Later milestones are written against that M5, so anyone building from them would assume things that no longer exist. Where they differ, spec #77 and `GLOSSARY.md` win.

| Plan's M5                                           | What's true now                                                                               | Who it affects                                                    |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| A Program with a fixed budget by Pattern            | A Weekly Budget of Sets per Muscle, from Goal and days per week. A Block has no Program (#91) | M6 and M9 read Blocks; M9's "next program" needs a word           |
| Target RPE, and a lower one on a bad day            | No RPE is prescribed. Sets are what change                                                    | M6's spec decides whether target RPE returns                      |
| Mode chips                                          | Workout Length and equipment are separate choices for one Workout, on the phone               | New day options join them: Quick (#98), Recovery Workout (#97)    |
| Gym and Home for one Workout                        | Only Full gym and Bodyweight only                                                             | Known limit: a gym profile that isn't primary gets standard loads |
| Changing mode mid-Workout                           | Equipment can't change after Start, as a started Workout is a snapshot                        | Exercises can still be changed by hand                            |
| "Session 2 of 3 · Push 8/12" on Today               | This Week stays, and there's no Week Ledger screen                                            |                                                                   |
| Tomorrow's session                                  | The next Planned Workout, as the app has no fixed weekdays                                    | M8's evening summary says "next"                                  |
| A planned session's id is the Workout's `sessionId` | `plannedWorkoutId` on the Workout                                                             |                                                                   |
| Calibration sets                                    | Working Levels are seeded for every Exercise, so M5 has none                                  | M6 lists them again, and should check they're needed              |

## Consequences

- The plan's M5 features that the spec dropped without a decision are issues, not lost: #91 to #99. M5 is done when those due before M6 are in, in this order: #95, #98, #92, #93, #94, #91, #96 and #97. Conditioning (#99) waits for M10, as nothing can log it until then.
- `main` takes M5 only once all of that is done and tested together: it's for a finished milestone, not each spec. Spec #77's phone checks passing doesn't move it.

## Considered Options

- **Rewrite the PDF**: it would stay the single plan, but it isn't in the repo and nothing keeps it true.
- **Build every gap before the phone checks**: M5 would match the plan at once, but the checks would wait weeks, and each change would reopen them. Running them first tested spec #77 on its own.
