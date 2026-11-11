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
       │    ├─ WorkoutUploader: POST /workouts and PUT /check-ins/:date through useApi
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
- **Loads are stored in kg and shown in the user's unit** (#126). `User.unit` is lb or kg, lb when never chosen
  (`useWeightUnit`, picked on Profile). Every label in `format.ts` takes the unit and rounds a load to 0.5 of it
  (`loadInUnit`, `packages/shared/src/units.ts`). A load typed in pounds is stored as its exact kg (`toKg`), never
  rounded, so 25 lb always shows back as 25 lb; `Set.kg` has no step rule. Equipment Profile weights are entered in
  the unit too (`loads.ts`, its own lb and kg size lists).
- **The load stepper steps through real loads** (#58): `loadStep` in `set-entry.ts` steps the primary Equipment
  Profile's loads for the Exercise (`exerciseLoadsKg`, the same loads the Assessment suggests from) as the user sees
  them, so a load a hair off the one shown never sticks, staying put past the lightest or heaviest, and by 5 lb or 2 kg
  when the loads aren't known. `set-entry.ts` also parses the typed text, steps reps (1) and seconds (5), and names the
  load step for screen readers (`loadStepLabel`: "Next heavier weight", or "Plus 5 lb" when the loads aren't known).
- **One Load Step is the next load the profile has** (#127). `availableLoadsKg` (`packages/engines/src/equipment.ts`)
  lists them: dumbbells, kettlebells, the bar plus plate pairs (summed in the unit the plates are sized in, so pound
  plates make exact pound loads) and a cable stack from `loads.cable_machine.stepKg`. Progression steps with
  `nextLoadKg(exercise, profile, kg, direction)`, undefined past the heaviest or lightest; `roundToLoadKg` and
  `loadAtOrBelowKg` round to them. The API reads every profile through `withDefaultLoads` (`equipmentProfilesOf`,
  `apps/api/src/users.ts`): a cable machine with no step steps 10 lb or 5 kg by the user's unit, and a profile with
  all of Full gym's equipment and no free weights listed (the onboarding gym) has Full gym's loads. Full gym's loads
  follow the unit (`builtInEquipment(choice, unit)`), so the unit is part of `planInputsKey`. The onboarding gym is
  asked only for its cable step (`loadTagsAsked`).
- **A past Workout starts up to 7 days before its last Set** (#129). `WorkoutUpload` (`@fit/shared`) is the rule, and
  both POST /workouts (400) and the Logbook's finish use it, so a Pending Workout always uploads. It counts back from
  the Sets, not the clock, so an upload that comes days late isn't refused; `Workout` itself doesn't have the rule, so
  History never fails on an older one. A Manual Workout logged afterwards ("Log a past workout" on Today,
  `pastWorkoutDays`) keeps `pastStart` on the In-progress Workout, while `startedAt` stays when logging began, so the
  clock and the forgotten check follow the logging. `finishTimes` gives Finish its first times: `pastStart` and an
  hour later, with Edit times open. Its Sets are logged now, so Fatigue counts a Set from its `loggedAt` but never
  after its Workout's `endedAt` (`creditingSets`); the Week Ledger already goes by `startedAt`.
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
       ├─ Working Levels: packages/engines/src/working-levels.ts seedWorkingLevels; the shape is WorkingLevel in
       │  packages/shared/src/assessments.ts, the rep ranges repRange beside the seeding
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
  only the newest sets the Working Levels (a retake keeps the last Block's progress, #137); `GET /assessments/latest`
  and Today's retake check use the same order.
- **The Assessment is a snapshot**: deleting its Workouts from History leaves it and the Results link.
- **Bodyweight maximums use Epley uncapped** (`epley`), because the Working Level inverts it (`epleyReps`) and the
  round trip must give the tested Exercise back its reps; `e1rm` refuses more than 12 reps.
- **Results round a Working Level to what the user can lift** (`roundToLoadKg`): the nearest load the profile offers,
  or the nearest 0.5 kg when the loads aren't known. An Exercise that needs a barbell is left out when its Working Level
  is under the empty bar, the profile's own or an assumed 20 kg (#70). The stored Working Level isn't changed.
- **A weighted Working Level is a load and a target reps** (#131), seeded at the heaviest load the user's Equipment
  Profiles have at or below what Epley gives for the bottom of the range with 2 in reserve, or left unrounded when none
  is that light, so a barbell lift under the bar stays out (#70). Each level also has `movedBy` (the Assessment's B, or
  null when the planner works one out), `misses`, and `outgrown`: a bodyweight seed above 15 reps is stored at 15 and
  outgrown, as is a timed seed above 60 seconds at 60 (`TIMED_TOP_SECONDS`), and the planner gives an outgrown Exercise's place to its `progression` when it can (`withoutOutgrown`).
- **Levels stored before #131 are converted at startup** (`migrateWorkingLevels` in `apps/api/src/assessments.ts`,
  rule in `migrateWorkingLevel`): any level without `misses`. It's idempotent, and makes the user's current plan due.
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
     the plan. What's possible stays; only what's pickable stands in. Both built-ins are builtInEquipment in
     equipment.ts
API (apps/api/src/planned-workouts.ts, routes/planned-workouts.ts): the current plan, built if planIsDue
  (plan-rebuild.ts), and rebuilt after every upload (routes/workouts.ts) and Profile change (routes/users.ts)
Phone
  ├─ Logbook: plannedWorkout, refreshPlannedWorkout, startPlannedWorkout; key logbook:planned-workout
  ├─ usePlannedWorkout (features/today/hooks): the copy, asking the server on every Today visit
  ├─ useDaysWorkout: the user's choices over daysWorkout (days-workout.ts), held in memory until Start
  ├─ useCheckIn: today's check-in (stored-check-in.ts, key today.checkIn, by local date), passed to daysWorkout with
  │  the usual choices. Each check-in is also queued on the Logbook (queueCheckIn, key logbook:pending-check-ins, one
  │  per date) and uploaded by sync() after the Pending Workouts, retried the same way, to PUT /check-ins/:date
  │  (apps/api/src/check-ins.ts, routes/check-ins.ts; GET /check-ins/:date reads one back). Readiness never waits on it. readinessShare (check-in.ts) trims the lowest-priority Sets after the Length cut, unless the
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
- **`target.kg` is a profile load, kept as it is** in the draft; the phone shows it in the user's unit.
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
- **Jumps come only from the jump rule** (#105, `jumps.ts`): athletic, `UserProfile.includeJumps` on, the squat tested
  rather than estimated, and no knee or ankle injury (`avoidWith`). `possibleExercises` leaves them out, so the score
  never picks one; `jumpsForWorkout` puts 2 of them, 3 Sets each, first in the first 2 Workouts of the week, one that
  goes up and one forward or sideways, as far as the 130% cap allows. A jump has no Working Level: its target is `{ unit: "reps" }` holding its
  contacts (`STRENGTH_RATIOS` kind `contacts`), halved when `PlanWorkoutInput.deloadWeek`, which the API sets from
  `weekOfBlock`. It's logged as a bodyweight Set whose reps are contacts, which the phone labels so (`isJumpSlug`). On a
  built-in choice a jump only stands in for a jump (`alternativeOptions`). The six jumps also need `seed:exercises`.
- **A Check-in is stored once per user per local date** (#125), the phone's date, sent in the URL. The server keeps the
  one with the latest `checkedInAt`, so a retry or a late upload of an earlier one changes nothing, and the PUT answers
  with the Check-in the date now has. The phone's queue keeps only the newest per date, and one replaced mid-upload
  still goes up next. Sign-out clears the queue; a failed Check-in never holds up a Pending Workout.
- **The 130% cap never gives way** (#128, `WEEKLY_CAP` in `weekly-budget.ts`). A pick, jumps and the required picks
  included, is left out when a primary Muscle with a budget would go over 1.3 × its budget, counting the Week Ledger
  (secondary credit included) and the Sets already planned. So the plan can end well short of Long, and the Day's
  Workout's `estimatedSeconds` is the honest time. When the cap leaves nothing at all, the plan is the Recovery Workout
  (`whenCapped`), which credits nothing, its Exercises standing as themselves on every built-in choice; were it not to
  fit the equipment, injuries or time, one Set of the best Exercise within the cap. A stored plan needs an Exercise. `pnpm --filter @fit/engines simulate` prints each Muscle's share of its
  budget from primary credit and in total; `plan-outcomes.test.ts` pins the primary side.
- **A heavy two-legged squat once a week for athletic and build_muscle** (`requiredSquat`, #100 and spec #119's
  review): back squat, else goblet squat, first in the Workout until the week has had 3 Sets of it, as both Goals score
  one-sided leg work above it (athletic's own one-sided pick, `requiredPick`, comes first).
- **Build and tune with the simulation.** Scores tie often, as many Exercises share budgeted credits. The planner is
  deterministic, so ties fall to last week's Exercises, then the longest Sets, then the slug, never library order.
  `plan-outcomes.test.ts` pins what a user should see, with the library in either order: run it after any tuning.

## Progression (#132, ADR 0007)

```text
progressWorkingLevel (packages/engines/src/progression.ts): pure. ProgressionInput (the Working Level, the Workout,
  its Workout Exercise, the library Exercise, the primary Equipment Profile, deloadWeek, plannedSets) → Progression
  ({ level, change }) or null when it doesn't move the level. judge() picks the Sets (the lowest load used), then RULES
  run in order and the first to decide wins: return a Progression, UNMOVED, or undefined to pass on
API: progressWorkingLevels (apps/api/src/progression.ts), called by POST /workouts after assessIfPaired and before
  the rebuild, on retries too. Writes each moved level to workingLevels, guarded on the movedBy it read
Planner: the level's change goes on its Planned Exercise (withChanges in plan-workout.ts), an outgrown one worded as
  harder-variant (on the variant given instead) or held-at-top; daysWorkout keeps it only on the Exercise itself
Phone: progressionChangeLine (features/today/plan-reasons.ts) under each Exercise in planned-workout-sheet.tsx
Schema: ProgressionChange (packages/shared/src/progression.ts), on WorkingLevel.change and PlannedExercise.change
```

- **Adding a rule** (#133–#137): write a `ProgressionRule` and put it in its place in `RULES`; the comment above
  `RULES` says where each ticket's goes. `moved()` records the Workout and the reason, and drops an earlier reason.
- **Only a later Workout moves a level**: `laterWorkoutsOnly` compares `startedAt` with `movedBy`, so a retry, a late
  Pending Workout or a past Workout never moves it twice or backwards. A judged Workout records itself even when
  nothing changed; an unjudged one (UNMOVED) records nothing.
- **Ballistic Exercises and carries** (#136: `jumpsNeverMove`, `ballisticByLoad`, `carriesMoveByLoad`, after
  `missesBringItDown`, before `rpeTenHolds`): a jump never moves. A weighted Ballistic Exercise stays at 8 reps and
  takes a Load Step (`load-up`) when every Set reaches 8 and the last Set's RPE is 7 or lower, or with no RPE on the
  3rd Workout since its load last went up. That count is `workoutsSinceLoadUp` on the kg Working Level (optional,
  absent = 0; every judged Workout adds 1, a step up or new base resets it); it handles RPE 10 itself so the Workout
  still counts. It still Misses. A carry (kg level with no `repRange`) moves only to a different logged load
  (`new-base`, reps kept), whatever the RPE, and never Misses.
- **Ladders** (#135: `bodyweightLadder`, `timedLadder`, `bandLadder`, last in `RULES`): +1 rep to 15, +5 seconds to
  60, then `outgrown` (the planner gives the `progression` variant, whose level is seeded like any other). A band
  level climbs 10–15 reps, then steps to the next band the primary profile lists (`ownedBandLevels`) at 10, and at the
  heaviest climbs to 20 then is outgrown. A band Set's logged kg is ignored: the level's band is assumed.
- **Misses** (#134, `missesBringItDown`, before the #136 rules): judged Sets averaging more than 2 reps (10
  seconds) short of target add to the level's `misses` and hold it; the second in a row drops a weighted level one
  Load Step to the bottom of the range (`load-down`), or the target 2 reps when that step is over 12% lighter or there
  isn't one (`target-down`), and a bodyweight or band target 2 reps or a timed one 10 seconds, never to an easier
  variant. `moved()` sets `misses` to 0 unless the rule passes it, so any other move ends the run; UNMOVED keeps it
  (one Set, an Assessment, and the deload week). A new base at another load is never a Miss. Jumps and carries have none.
- **RPE 10** (#133, `rpeTenHolds`, after `missesBringItDown` and before `newBase`): `rpe` on the Exercise's last
  Set logged (`workoutExercise.sets.at(-1)`, not the judged Sets) at 10 holds the load and target (`rpe-10`), ending a
  run of Misses; a Miss at RPE 10 is still a Miss. The phone offers it in `ExerciseLogging`
  (`features/workouts/last-set-rpe.ts`: once a planned Exercise has its Sets, after every Set without a plan; never in
  an Assessment or on a Recovery Exercise), rating the logged Set in place through `editSet`, so skipping costs no tap.
- **A load other than the prescribed one** (the level rounded to the primary profile's loads) becomes the new base at
  the fewest reps lifted there.

## The deload week and the retest (#137, ADR 0007)

- **Which week**: `weekOfBlock` (packages/engines/src/block.ts), from the latest Assessment, in the user's timezone.
  The API passes `deloadWeek` to `planWorkout` (planned-workouts.ts) and to progression (progression.ts, by the
  Workout's `startedAt`).
- **The plan** (`deloaded` in plan-workout.ts): the same Sets; weighted targets 10% lighter, rounded down to a load
  the profile has (its lightest when none is that light, 0.5 kg when its loads aren't known); reps and band targets
  at 70%, rounded down, at least 5; timed at 70%, rounded down to 5 seconds, at least 15; never above the usual
  target. Alternative Exercises too. Jumps halve their contacts instead (jumps.ts).
- **Progression**: `notInTheDeloadWeek` returns UNMOVED, so nothing moves and the run of Misses stays.
- **Today**: `assessmentOffer` gives `{ kind: "retake", deloadWeek }` in the deload week (keyed by the week's Monday, so
  a dismissal lasts the week); `AssessmentSection` shows "Retake the Assessment" with Start assessment A.
- **The retake** (`assessIfPaired`): when the user had an Assessment before, `keptByRetake` (block.ts) names the
  Exercises it didn't test that have Sets logged in non-Assessment Workouts in the `BLOCK_WEEKS` weeks up to its A.
  Their stored levels stay; every other level is replaced by the new Assessment's, or goes.

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

## Error reporting (#122)

Errors on the web app and the API go to Sentry, tagged with the deploy's environment. Without a DSN nothing is
reported, so local runs, tests and CI need nothing set.

- **API:** `src/error-reporting.ts`. `server.ts` starts Sentry; `buildApp` adds the user hook and the test route. Sentry's Fastify integration reports errors
  thrown in a route (5xx only) and uncaught exceptions. A `preHandler` hook adds the Clerk user id on the request's own
  scope.
- **Web app:** `src/features/error-reporting/error-reporting.web.ts` reports uncaught errors and unhandled rejections.
  The root layout sets the Clerk user id. The native build gets the no-op `error-reporting.ts`.
- **Personal data:** nothing but the Clerk user id. `@fit/shared`'s `MINIMAL_DATA_COLLECTION` turns off user info,
  cookies, headers, bodies, query strings and local variables, and `withoutPersonalData` strips the same again in
  `beforeSend`. The web app also drops console and tap breadcrumbs.
- **Test errors:** `/debug-error` on the web app throws one, and calls the API's `GET /debug/error` (signed in only),
  which throws another, so one page checks both sides of a deploy. Checks E1–E3 in `docs/manual-checks.md`.

### Setting it up (a human, once)

1. In Sentry (free tier), create a project for the API (platform Node.js) and one for the web app (React). Each
   project's DSN is under **Project settings → Client Keys**. A DSN is not a secret, but it stays out of the repo.
2. Set these on each deploy. The environment is `production` or `staging`; unset, events say `development`.

   | Where                             | Variable                         | Value                 |
   | --------------------------------- | -------------------------------- | --------------------- |
   | Render, production API service    | `SENTRY_DSN`                     | the API project's DSN |
   | Render, production API service    | `SENTRY_ENVIRONMENT`             | `production`          |
   | Render, staging API service       | `SENTRY_DSN`                     | the API project's DSN |
   | Render, staging API service       | `SENTRY_ENVIRONMENT`             | `staging`             |
   | Cloudflare Pages, Production      | `EXPO_PUBLIC_SENTRY_DSN`         | the web project's DSN |
   | Cloudflare Pages, Production      | `EXPO_PUBLIC_SENTRY_ENVIRONMENT` | `production`          |
   | Cloudflare Pages, Preview (`dev`) | `EXPO_PUBLIC_SENTRY_DSN`         | the web project's DSN |
   | Cloudflare Pages, Preview (`dev`) | `EXPO_PUBLIC_SENTRY_ENVIRONMENT` | `staging`             |

   The web app's are read at build time, so redeploy after setting them. Render's `RENDER_GIT_COMMIT` becomes the
   API's release.

3. Run E1–E3 in `docs/manual-checks.md`.

Web stack traces point into the minified bundle: they show the file and line, but not the source. Uploading source
maps would fix that and isn't set up.

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
