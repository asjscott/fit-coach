# Workouts: how the pieces connect

Logging, Pending Workouts, sync and History (spec #2). Why the phone holds only unfinished and Pending Workouts:
`docs/adr/0001-history-lives-on-the-server.md`.

## Flow

```text
screens (apps/mobile/src/features/workouts/views)
  └─ LogbookProvider (logbook-provider.tsx): one Logbook per app, its state, and finish → toast
       ├─ Logbook (packages/engines/src/logbook.ts): every rule with no UI; the main test seam
       │    ├─ DeviceStorage: device-storage.ts (phone, SQLite) / device-storage.web.ts (web, localStorage)
       │    ├─ WorkoutUploader: POST /workouts through useApi
       │    └─ PreviousSetsSource: GET /workouts/previous-sets?slug= through useApi (4 s timeout)
       └─ useSyncTriggers: sync() on foreground and on reconnect (expo-network)
History (history-provider.tsx, hooks/use-history.ts): GET /workouts, held in memory only, paged back far enough to
  cover the 8 weeks of weekly Volume; Pending Workouts merged in
Training summaries (packages/engines/src/training-summaries.ts): Volume, Sets, weeks, weekly Volume and the Previous
  Sets selection, pure functions
API (apps/api/src/workouts.ts, routes/workouts.ts): idempotent POST, paged GET (before + beforeId), DELETE, and
  GET /workouts/previous-sets (newest Workout with the Exercise, then the shared selection; null when none)
Schemas shared by app and API: packages/shared/src/workouts.ts
```

## Gotchas

- **Storage goes through `deviceStorage`.** Metro picks `device-storage.web.ts` on web by file extension; `expo-sqlite`'s
  web build fails in Safari and with two tabs open. `pnpm --filter @fit/mobile test:web` checks this in WebKit and
  Chromium.
- **The Logbook serialises its calls** (`serially`) so quick taps can't overwrite each other; `sync()` uploads outside
  that queue so logging a Set never waits on the network.
- **Previous Sets are a snapshot saved on the In-progress Workout's Workout Exercise** when it's added (ADR 0002): the
  server's answer or a Pending Workout's, whichever Workout is newer. A failing source counts as no answer. The finished
  `WorkoutExercise` schema refuses `previousSets` (400), while still dropping other unknown fields.
- **The finished Workout's `id` is generated on the phone**, which is what makes a retried upload idempotent (201 then
  200).
- **Exercises come from the library built into the app** (`EXERCISES` in `@fit/engines`), not `/exercises`, so the picker
  works offline; an unknown slug is shown as-is (`exerciseName`).
- **New native modules need a new development build** (`expo-sqlite`, `expo-network` so far). Add dependencies with
  `npx expo install` and check the SDK 58 docs first (`apps/mobile/AGENTS.md`).

## Assessment (spec #29)

Two Assessment Workouts (A: squat, hinge, core; B: push, pull) give the Assessment and the first Working Levels.

```text
Today offer (packages/engines/src/assessment-offer.ts assessmentOffer, rendered by
  apps/mobile/src/features/today/components/assessment-section.tsx): start A / start B (+ Redo A) /
  "Results once synced" / Results link, each dismissable (hooks/use-dismissed-offer.ts, keyed by offerKey)
Retake: Profile (features/user/views/profile-view.tsx) starts A
Starting (features/assessment/hooks/use-start-assessment.ts → Logbook.startAssessment in packages/engines/src/logbook.ts)
  └─ chooseTests (packages/engines/src/assessment-tests.ts): ranked list per Pattern, first available and safe;
     ASSESSMENT_PATTERNS, testedPatternOf, referencePatternOf (carry follows hinge)
Logging (features/workouts/components/current-exercise-box.tsx renders Logbook.protocolState and Logbook.nextSetDraft)
  └─ protocolState (packages/engines/src/assessment-protocol.ts): first load, next load, at-heaviest, one-set, done,
     load-limited; isRatedTest says which test Sets take an RPE (weighted only)
Server (apps/api/src/assessments.ts assessIfPaired, called by POST /workouts in routes/workouts.ts)
  ├─ pairToAssess (packages/engines/src/assessment-pairing.ts): which A and B make the Assessment; Today's offer shares
  │  its latestAssessmentWorkout
  └─ assess (packages/engines/src/assess.ts): top Sets, maximums, Reference Strengths, estimates
       ├─ ratio table: packages/engines/src/strength-ratios.ts (one entry per library Exercise)
       ├─ Working Levels: packages/engines/src/working-levels.ts seedWorkingLevels
       └─ Epley both ways: packages/engines/src/e1rm.ts
GET /assessments/latest (routes/assessments.ts) → features/assessment/hooks/use-latest-assessment.ts
Results: features/assessment/views/assessment-results-view.tsx (route assessment-results), grouped by
  packages/engines/src/working-level-sections.ts
Schemas: packages/shared/src/assessments.ts; Set.rpe and Workout.assessment in workouts.ts
```

### Gotchas

- **The In-progress Workout keeps the `bodyProfile` (weight, gender) it started with**, and `protocolState`'s first
  load reads it from there, not from the current profile.
- **Only weighted tests are rated.** A bodyweight or timed test is one unrated Set to the most reps or seconds the user
  can do, and that Set is its maximum; the Logbook refuses an unrated weighted test Set.
- **Load-limited means different things in the two places.** The Logbook ends a test only when a Set past 12 reps
  short of RPE 9 was at the heaviest load the Equipment Profile has (or the loads aren't known); `assess` has no loads,
  so any last Set past 12 reps without a top Set is load-limited.
- **Pairing**: a B pairs with the latest A that started before it, unless that A is already in an Assessment; an A that
  arrives late pairs with the first B it's the latest A for. A pair is assessed once, so a retried upload recomputes
  nothing.
- **Pairing runs in one transaction** (so MongoDB must be a replica set, as Atlas is and `dev:local` makes it): the
  Assessment and its Working Levels are stored together or not at all. Unique indexes on `aWorkoutId` and
  `bWorkoutId` make an upload racing another retry the transaction and find the pair taken.
- **POST /workouts pairs on the 200 retry too, and a pairing failure fails the upload (500)** though the Workout is
  stored: the phone keeps it Pending, and the retry works the Assessment out.
- **POST /workouts is refused (403) before onboarding**, so pairing always has the weight and gender `assess` needs.
  The app never offers logging before then: `(app)/_layout.tsx` sends a user who isn't onboarded to onboarding.
- **"Newest" is by the B's `startedAt` (`Assessment.bStartedAt`), not server time.** Every Assessment is stored, but
  only the newest replaces the Working Levels; `GET /assessments/latest` and Today's retake check use the same order.
- **The Assessment is a snapshot**: deleting its Workouts from History leaves it and the Results link.
- **Bodyweight maximums use Epley uncapped** (`epley`), because the Working Level inverts it (`epleyReps`) and the
  round trip must give the tested Exercise back its reps; `e1rm` refuses more than 12 reps.
- **Stored Assessments without a field the schema later required** (`referenceStrength`, `maximum`, `bStartedAt`)
  fail to parse in `findLatestAssessment`: dev data only, so drop the collection.

## Running things

- API without the real database or Clerk: `pnpm --filter @fit/api dev:local` (in-memory MongoDB replica set; `X-Dev-User` header
  picks the user). `apps/api/.env` points at the real database.
- Web storage in real browsers: `pnpm --filter @fit/mobile test:web`.
