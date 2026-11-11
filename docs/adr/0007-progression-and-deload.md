# Progression by reps, with a deload that lightens loads

Until M6, an Assessment sets each Working Level and nothing moves it again. The Coach now moves it by double progression, from the reps the user logs. RPE is optional, on the last Set of each Exercise, and only holds the load where it is. Reps are logged every Set anyway and mean the same thing every time, while RPE is a judgement most people log badly and would slow down logging.

## The rules

- A Working Level is a load and a target reps, within a rep range: 8–12 by default, 6–10 for barbell lifts, 10–15 for band-only Exercises.
- When every Set reaches the top of the range, the next Workout goes up one Load Step, to the reps Epley predicts there, if that's at least the bottom of the range; otherwise reps keep climbing towards 20. On light dumbbells and kettlebells one step can be 14–50%, and a plain step back to the bottom of the range would be a Miss every time ([research](../research/progression-and-deload.md)). Otherwise, when every Set reaches the target, the target goes up 1 rep. An RPE of 10 on the last Set holds both.
- A Miss is an Exercise whose Sets average more than 2 reps short of target. Two Misses in a row on the same Exercise drop it one Load Step and reset the target to the bottom of the range, unless that step is more than about 12%, when the target drops 2 reps and the load stays. A skipped Workout isn't a Miss.
- Bodyweight and timed Exercises move to their harder variant once every Set reaches 15 reps or 60 seconds, with a Working Level from Reference Strength. Bands step from light to medium to heavy the same way. Two Misses lower a bodyweight target 2 reps, or a timed one 10 seconds; the Coach never moves to an easier variant by itself.
- Ballistic Exercises keep a fixed 8 reps, since power needs fast reps well short of failure, and move only by load: a Load Step when every Set reaches 8 with a last-Set RPE of 7 or lower, or at most once every 3 Workouts with no RPE. Carries, whose reps mean nothing, move only when the user logs a different load.
- The deload week, the 5th of a Block, keeps the Sets and lightens the work: loads 10% lighter rounded down to a Load Step, bodyweight, band and timed targets at about 70%. Nothing progresses and nothing is a Miss that week.
- Calibration sets are dropped. Every Exercise has a strength ratio, which the library's integrity test enforces, so every Exercise already gets a Working Level from Reference Strength.

## Consequences

- Load Steps need to be known. Where an Equipment Profile lists its loads (barbell plates, dumbbells, kettlebells), a Load Step is simply the next load it has; only cable and machine, which list none, record a step, 10 lb by default.
- Working Levels change after an upload, so they're the first server state that History changes. That's why API route tests start in M6.
- `GLOSSARY.md`'s Working Level, "kg for 8 reps", changes to a load and a target within a range when M6 is built.
- The Assessment becomes a check rather than the only source of loads: in the deload week the Coach offers a retest, and ignoring it starts the next Block.
- A retest doesn't wipe the Block's progress. It sets the Working Levels of the Exercises it tested, and of Exercises with no logged Sets in the last Block, from the new Reference Strength; every other Exercise keeps its progressed level, since four weeks of logged reps say more about it than a strength ratio does.

## Considered Options

- **Progress by RPE**: adapts load to the day, but needs an RPE on every Set.
- **A deload that halves the Sets and keeps loads**: easier to build, as only the Weekly Budget changes, but the user chose to keep the Sets and drop the load.
- **Keep calibration sets** for Exercises with no Working Level: not needed while every Exercise has a ratio.
