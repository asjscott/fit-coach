# Workouts: how the pieces connect

Logging, Pending Workouts, sync and History (spec #2), the Assessment (spec #29), and Planned Workouts (spec #77). Why
the phone holds only unfinished and Pending Workouts: `docs/adr/0001-history-lives-on-the-server.md`. Why the server
builds plans and the phone keeps a copy: `docs/adr/0003-the-server-builds-planned-workouts.md`.

## Flow

```text
screens (apps/mobile/src/features/workouts/views)
  └─ LogbookProvider (logbook-provider.tsx): one Logbook per app, its state, and finish → toast
       ├─ Logbook (packages/engines/src/logbook.ts): every rule with no UI; the main test seam
       │    ├─ DeviceStorage: device-storage.ts (phone, SQLite) / device-storage.web.ts (web, localStorage)
       │    ├─ WorkoutUploader: POST /workouts through useApi
       │    ├─ PreviousSetsSource: GET /workouts/previous-sets?slug= through useApi (4 s timeout)
       │    └─ PlannedWorkoutSource: POST /planned-workouts/current through useApi
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
- **The kg stepper steps through real loads** (#58): `Logbook.nextLoadKg` gives the next lighter or heavier load the
  primary Equipment Profile makes for the Exercise (`exerciseLoadsKg`, the same loads the Assessment suggests from;
  rule in `stepLoadKg`, `packages/engines/src/equipment.ts`), staying put past the lightest or heaviest, and by 2 kg
  when the loads aren't known. `set-entry.ts` only parses the typed text, steps reps (1) and seconds (5), and names
  the kg step for screen readers (`kgStepLabel`: "Next heavier weight", or "Plus 2 kg" when the loads aren't known).
- **The rest timer lives in memory on the LogbookProvider** (#95), not in the Logbook or storage: it belongs to the
  Workout, so it follows the user between Exercises and to Today, and a force-quit loses it. Only Log set starts or
  restarts it; Finish, Discard and sign-out end it. Its length and countdown are pure (`rest-timer.ts` in
  `@fit/engines`): `max(45, secondsPerSet − 30)` to a fixed end time, so backgrounding doesn't skew it. The provider
  also keeps the screen on (`expo-keep-awake`) while a Workout is in progress.
- **Times follow the phone's 12- or 24-hour setting, not its locale** (#69): `timeLabel` and Android's time dialog both
  read `uses24HourClock` (`format.ts`, from `expo-localization`), and the dialog is 24-hour whatever the phone says
  without it. The iOS pickers follow the setting by themselves. Hermes alone goes by the language: en-GB with a Canadian
  region is 24-hour there and 12-hour in the pickers.
- **On iOS a presented screen needs a `SafeAreaProvider` inside it** (#68). A `SafeAreaView` looks for its provider up
  its superviews, and iOS hosts a presented modal outside the root provider's views. With none found, the view falls
  back on its own insets and gets no change notifications, so it can keep a zero bottom inset. `workout/_layout.tsx` has
  the provider, on iOS only; web's static build keeps Expo Router's non-measuring provider. The Add exercise sheet is
  presented on top, outside it, and has no inset, which its list doesn't need to clear the home indicator.
- **New native modules need a new development build** (`expo-sqlite`, `expo-network`, `expo-localization`, `expo-keep-awake` so far). Add dependencies with
  `npx expo install` and check the SDK 58 docs first (`apps/mobile/AGENTS.md`).

## Assessment (spec #29)

Two Assessment Workouts (A: squat, hinge, core; B: push, pull) give the Assessment and the first Working Levels.

```text
Today offer (packages/engines/src/assessment-offer.ts assessmentOffer, rendered by
  apps/mobile/src/features/today/components/assessment-section.tsx): start A / start B (+ Redo A), each naming its
  untested Patterns / unavailable (canAssess: A or B has no test) / "Results once synced" / Results link, each
  dismissable (hooks/use-dismissed-offer.ts, keyed by offerKey). Tests from hooks/use-chosen-tests.ts
Retake: Profile (features/user/views/profile-view.tsx) starts A, unless canAssess is false
Starting (features/assessment/hooks/use-start-assessment.ts → Logbook.startAssessment in packages/engines/src/logbook.ts)
  └─ chooseTests (packages/engines/src/assessment-tests.ts): ranked list per Pattern, first available and safe;
     partTests (a part's tests in order, and its untested Patterns), canAssess, ASSESSMENT_PATTERNS, testedPatternOf,
     referencePatternOf (carry follows hinge)
Logging (features/workouts/components/current-exercise-box.tsx renders Logbook.protocolState as a banner, worded by
  protocol-note.ts, and Logbook.nextSetDraft)
  └─ protocolState (packages/engines/src/assessment-protocol.ts): first load, next load, at-heaviest, one-set, done,
     load-limited; isRatedTest says which test Sets take an RPE (weighted only); testProgress (the next test, all done)
     for views/workout-view.tsx
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
- **A done test takes no more Sets** (#52): the Logbook refuses one once `hasTestResult` (a bodyweight or timed test's
  one Set, or a top Set); load-limited needs the loads, so only the screen enforces it (`takesNoMoreSets`). Correcting
  or deleting the Set reopens the test. `Logbook.testProgress` gives the next test (the first that still takes Sets)
  and whether all are done. The Workout opens on the next test (#49), but never moves by itself: a test that becomes
  done stays open with its Done banner and "Next test" in place of Log set (#52, #53). Finish turns primary once every
  test is done.
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
- **Results round a Working Level to what the user can lift** (`roundToLoadKg`): the nearest load the profile offers,
  or the nearest 0.5 kg when the loads aren't known. An Exercise that needs a barbell is left out when its Working Level
  is under the empty bar, the profile's own or an assumed 20 kg (#70). The stored Working Level isn't changed.
- **Stored Assessments without a field the schema later required** (`referenceStrength`, `maximum`, `bStartedAt`)
  fail to parse in `findLatestAssessment`: dev data only, so drop the collection.

## Planned Workouts (spec #77)

The Coach's next Workout on Today, built by the server from the Weekly Budget, and kept on the phone so it works with no
signal. Simulation of the real planner: `docs/research/planner-simulation.md` (`pnpm --filter @fit/engines simulate`).

```text
planWorkout (packages/engines/src/plan-workout.ts): pure, only the server calls it. Gives weekStart, plannedExercises
  in priority order, and cue
  ├─ possibleExercises: primary Equipment Profile, injuries, a target it can be prescribed at. Then pickableExercises:
  │  the rep cap and variety cap guards. Their order settles a tie: last week's first, then longest Sets, then slug
  ├─ Week Ledger (week-ledger.ts): weekLedger, recalculated from logged Sets; mondayOf is the server's week
  ├─ Weekly Budget (weekly-budget.ts): DOSES, DAYS_SCALE and the limits, weeklyBudget, fillOrder
  ├─ Recovery filter: muscleFatigue (fatigue.ts) from each logged Set's loggedAt; FATIGUE_HOURS and FATIGUE_LIMIT
  │  sit with the budget's tables. A tired primary Muscle leaves its Exercises out until nothing else helps the
  │  budget, and planWorkout returns the Muscles it held back (heldBack, not stored)
  ├─ scoreExercise (plan-score.ts): every tilt, in one place
  └─ withAlternatives (alternative-exercises.ts): each Exercise's options for Full gym and Bodyweight only, saved in
     the plan. What's possible stays; only what's pickable stands in. Both built-ins are BUILT_IN_EQUIPMENT in
     equipment.ts
API (apps/api/src/planned-workouts.ts, routes/planned-workouts.ts): the current plan, built if planIsDue
  (plan-rebuild.ts), and rebuilt after every upload (routes/workouts.ts) and Profile change (routes/users.ts)
Phone
  ├─ Logbook: plannedWorkout, refreshPlannedWorkout, startPlannedWorkout; key logbook:planned-workout
  ├─ usePlannedWorkout (features/today/hooks): the copy, asking the server on every Today visit
  ├─ useDaysWorkout: the user's choices over daysWorkout (days-workout.ts), held in memory until Start
  ├─ useCheckIn: today's check-in (stored-check-in.ts, key today.checkIn, by local date), passed to daysWorkout with
  │  the usual choices. readinessShare (check-in.ts) trims the lowest-priority Sets after the Length cut, unless the
  │  user picks Full workout. Card: check-in-card.tsx, shown by showsCheckIn (today-status.ts)
  ├─ Today (features/today/views/today-view.tsx): one card for the day (`todayCard` in today-status.ts, drawn by today-card.tsx), and planned-workout-sheet.tsx with the Exercises, targets, Length and equipment
  │  (rest-day.ts). todayPlan (today-status.ts) gates both: a plan, stale or not, and no In-progress Workout
  ├─ CurrentUserProvider: starts from stored-user.ts, so Goal and usual Length survive a cold start offline
  └─ useSendTimeZone: keeps User.timeZone in step, for the server's weeks
Schemas: packages/shared/src/planned-workouts.ts
```

### Gotchas

- **The stored plan is always the Long version.** `daysWorkout` applies equipment first, so the cut times what's really
  done, then cuts, then orders. The cut follows the order the planner added Sets: a 4th Set carries `fourthSetAfter`,
  its place among the picks, and goes last on a plan stored without it. A lone Set can remain.
- **The phone asks, the server decides.** POST `/planned-workouts/current` runs on every Today visit and after every
  sync. It's idempotent, as `planIsDue` compares `builtFrom` (`planInputsKey`) and `weekStart`, so a failed rebuild is
  just still due and logs rather than fails the request. A new plan input goes in `PlanInputs`.
- **A plan is also due on a new day in the user's timezone** (#93), so fatigue is judged when the user looks, not at
  the upload. `builtAt` is when it was last built: a rebuild that gives the same plan (`isSamePlan`) keeps it and its
  id, and only moves `builtAt` on. A plan stored without `builtAt` is due once.
- **A stale plan is never shown** (`PlannedWorkoutCopy.stale`). It goes stale while a Pending Workout exists and from an
  upload until the next answer (`awaitingNextPlan`). Today then says "Connect to plan your next Workout", but only once nothing is on its way (`syncing` on the Logbook provider), so an online finish never shows it. An answer that an upload overtakes is asked for again, not kept.
- **Starting takes a snapshot.** Exercises are copied in with `planned: {sets, target}`, dropped at Finish, so a rebuild
  can't touch a Workout under way. Discarding it shows the copy again. No Sets are logged at Start. `nextSetDraft` goes
  test load, then last Set, then target.
- **A Workout started from a plan opens on its first Exercise short of its target** (`nextPlannedExercise`), not the
  last one as a Manual Workout does.
- **`plannedWorkoutId` survives any edit**, and a finished Workout marks its plan finished only if it's still current.
  A plan replaced meanwhile stays replaced, and the link still points at a kept plan.
- **A stored Working Level wins unless it's for a way of doing the Exercise this profile doesn't have.** Otherwise the
  planner seeds one from the Assessment's Reference Strengths, which covers Full gym, Bodyweight only and profiles added
  since. A target is rounded to the profile's loads, and an Exercise under the empty bar isn't prescribed.
- **`target.kg` is a profile load, not forced to 0.25 steps**, while a logged `Set.kg` is: the Logbook rounds the draft.
- **A Full gym choice changes little for most users.** An Exercise still possible stays, so a user with no equipment
  gets the same bodyweight Workout, and a Full home gym only sees loads rounded to the built-in table.
- **`ballistic` needs `pnpm --filter @fit/api seed:exercises`** on the real database (needs `.env`, so it's a human
  step). `findExercises` parses stored docs, so an older collection reads as not Ballistic rather than failing.
- **Supersets are the phone's, and only to fit the Length** (#96, `supersets.ts`). `daysWorkout` pairs only when the
  Length would cut a Set: one pair at a time in priority order (`canPair`: main Pattern, never one-sided or
  Ballistic) until the Workout fits, then cuts what still doesn't. A pair is timed by `pairSeconds`, Sets ×
  (the longer `secondsPerSet` + 30) for the rounds they share. "No supersets" (`DayChoices.noSupersets`) goes back to
  cutting. At Start the partner's slug becomes `planned.supersetWith`, the partner's Workout Exercise id both ways,
  dropped at Finish with `planned`, so sync and History are unchanged. Removing one of the pair unpairs the other.
  `restAfterSet` (`rest-timer.ts`) gives no rest while the other is behind, and `pairRestSeconds` after the round.
  Once the one with fewer Sets is done and its last round is over, the other rests its own time (#111), and the box's
  note (`supersetNote`, `format.ts`) says so. The logging screen draws a pair with `SupersetBox` (layout A, Stacked),
  from `supersetGroups` and `supersetTurn`. Partner names are the library's as they are, never lower-cased.
  An Assessment or Recovery Workout never goes through `daysWorkout`, so is never paired.
- **A Recovery Workout isn't training** (#97, `recovery-workout.ts`). It's known by its Exercises: every one with Sets
  is a Recovery Exercise (`Exercise.recovery`), so a Workout needs no flag and sync and History are unchanged.
  `trainingWorkouts` leaves it out of This Week, the Rest Day, `finishedToday` and `planWorkout`; `creditsPerSet` gives
  a Recovery Exercise nothing, and the planner never picks one. It links to no plan, POST /workouts doesn't rebuild
  after one, and on the phone it neither makes the plan stale nor sets `awaitingNextPlan`, so the same plan stays on
  offer. The walk is one Set (#109, `takesOneSet`): `restAfterSet` gives no rest after it, and the logging screen
  offers "Next exercise" rather than a Set 2 (`takesAnotherSet`). Recovery Exercises have no Pattern and no strength ratio, so no Working Level. `recovery` also needs
  `seed:exercises` re-run, as `ballistic` did.
- **Build and tune with the simulation.** Scores tie often, as many Exercises share budgeted credits. The planner is
  deterministic, so ties fall to last week's Exercises, then the longest Sets, then the slug, never library order.
  `plan-outcomes.test.ts` pins what a user should see, with the library in either order: run it after any tuning.

## PRs (#130)

```text
findPrs (packages/engines/src/prs.ts): pure. A Workout's PRs, one per Exercise, against the user's earlier Workouts;
  prMeasure says what an Exercise's PR measures (e1rm, load for 8 reps, reps, seconds) or null (carry, Recovery,
  unknown slug)
API: recordPrs (apps/api/src/workouts.ts), called by POST /workouts after assessIfPaired. Stored on the workout doc as
  `prs`, returned on Workout.prs by POST and GET /workouts (routes/prs.test.ts)
Phone
  ├─ Logbook.sync keeps an upload's PRs under logbook:unseen-prs; unseenPrs / markPrsSeen
  ├─ Finish: FinishOutcome.prs, celebrated by toastWhenUploaded (upload-toast.ts) and marked seen
  ├─ Today: usePrNote + pr-note.tsx, a late upload's PRs, marked seen as soon as shown
  └─ History: the row's "New PR" and the detail's "New PR · …" per Exercise (prLabel, prsHeadline in format.ts)
```

- **Found once.** `recordPrs` stores `prs` on the first upload (`[]` when none) and a retry returns what's stored, so
  a PR is never found twice. Any `prs` a phone sends are dropped.
- **Measured against Workouts that started before it**, so a past or late Workout counts from its own day. A later
  Workout's stored PRs aren't revisited when an earlier one arrives late.
- **e1RM uses the reps logged**, not reps + (10 − RPE), so an Assessment's RPE-rated Sets count as lifted.
- **The Finish flow owns its Workout's PRs**: the provider keeps them out of `unseenPrs` while that upload is under
  way (`celebrating`), so Today's note never shows what the toast is about to.

## Route tests (#123)

`pnpm --filter @fit/api test` runs the API's route tests (`apps/api/src/routes/*.test.ts`, Vitest). Each test file
starts the whole API (`buildApp` in `apps/api/src/app.ts`, which `server.ts` listens on) against its own in-memory
MongoDB replica set, with Clerk switched off as in `dev:local`, and sends requests with Fastify's `inject`, so nothing
listens on a port and nothing reaches Clerk. The first run downloads the MongoDB binary, as `dev:local` does.

To write one:

```ts
import { useRouteTestApi } from "../test/route-test-api";
import { lifted, workout } from "../test/workouts";

const api = useRouteTestApi(); // once per file, at the top: starts the API before its tests, stops it after

it("stores an upload once however often it's retried", async () => {
  const user = await api.signIn(); // a new account, onboarded with dumbbells at home
  const finished = workout(2, [{ slug: "goblet-squat", sets: [lifted(14, 10), lifted(14, 9)] }]);
  expect((await user.post("/workouts", finished)).statusCode).toBe(201);
});
```

- **Every `signIn()` is a new account**, so tests in a file share the database but never each other's data. Pass
  `profile`, `equipmentProfile` or `onboarded: false` for another user. `user.get/post/patch/put/delete` return
  `{ statusCode, body }`, the body parsed.
- **Read results through routes, never the database.** What the Coach prescribes is `POST /planned-workouts/current`,
  Working Levels are `GET /assessments/latest`, History is `GET /workouts`. A result no route shows isn't something a
  route test can pin; say so in the test rather than reading the collection.
- **Fixtures** are in `apps/api/src/test/workouts.ts`: `workout(startedHoursAgo, exercises, extra)`, where `extra` can
  set `assessment` or `plannedWorkoutId`; Sets (`lifted`, `repsDone`, `held`); and `assessmentPair()`, a dumbbell
  user's A and B. Times count back from now, so a Workout lands in the plan's current week; `assessmentPair` starts 50
  and 26 hours ago.
- **The server reads the clock**, and plans are due on a new day in the user's timezone (UTC for test users), so build
  times from now rather than fixed dates.
- **Name tests in GLOSSARY.md terms and say which user story or issue they pin**, as `routes/workouts.test.ts` does.
- **Never import `db.ts` or a module that does at the top of a test file.** The database client reads `MONGODB_URI` when
  it loads, so the harness sets it before importing the app. Reach the server only through `api.signIn()`.

## Running things

- API without the real database or Clerk: `pnpm --filter @fit/api dev:local` (in-memory MongoDB replica set; `X-Dev-User` header
  picks the user). `apps/api/.env` points at the real database.
- Web storage in real browsers: `pnpm --filter @fit/mobile test:web`.
- The signed-in app, with no Clerk account or `.env`: `pnpm --filter @fit/mobile web:signed-in`, then
  `http://localhost:8187`. It starts the in-memory API on 3187 and swaps `@clerk/expo` for a signed-in stub in Metro, so
  every run is a new account at onboarding. Use it for any ticket that changes a signed-in screen.
  - To be several users from Playwright, add `x-dev-user` in `context.route` rather than from the page, since CORS
    refuses that header. A new `x-dev-user` is a new account.
  - For offline, abort the API in the same route and override `navigator.onLine`. Don't use `context.setOffline`: in
    dev, routes load from Metro on demand, so it fails with a red "Failed to fetch" that a phone never shows.
  - It can't show a real sign-in, Clerk with no signal, or native storage. Those stay in `docs/manual-checks.md`.
