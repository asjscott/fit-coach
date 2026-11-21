# Roadmap

This is the plan of record from M6 to the end. It replaces the Build plan PDF, archived at [`archive/build-plan-v1.pdf`](archive/build-plan-v1.pdf), which still describes the old M5 and a product for many users on the app stores. Where the two differ, this file wins; for words, [`GLOSSARY.md`](../GLOSSARY.md) and the ADRs in [`adr/`](adr/) win over both.

The detail here is kept brief on purpose. Each milestone gets its own spec issue when it starts, like #77, and is split into tickets from there. The spec may refine anything below; it should say so when it reverses a decision.

## What we're building

Fit Coach is a personal trainer for its author, in Vancouver, BC, and one or two people they invite. You tell the Coach what you did and ate, today or yesterday, and it tells you what to do today or tomorrow. The Coach plans each strength Workout from the equipment on hand, the week so far, other activities like runs and rides, and how the user feels, then moves each Exercise forward as the user gets stronger. Around that it adds the things that decide whether training works: food logged against targets with a nudge on what's left, body weight, a summary each evening that says what tomorrow holds, a review each Sunday, and a view of progress over months.

Structured logging is the backbone: Sets are logged live, offline, as progression needs them exact. A "Tell the coach" text box on Today ("yesterday I ran 10k, had eggs and toast") is the quick way in, and becomes dated Food Entries and Activities behind a confirm screen. See [ADR 0008](adr/0008-a-few-invited-users-and-tomorrow.md).

It is not a product for the public. Sign-up is invite-only, and there are no app stores, no GDPR flows and no growth features like XP or achievements. Each user's data is their own, so no spec may assume a single user.

## Constraints

- **Free, or very close to it.** No paid Apple Developer account, no paid hosting, no paid LLM by default. See [ADR 0005](adr/0005-free-tier-and-the-pwa-first.md).
- **The installed web app (PWA) is the daily app**: the Expo web build, added to the iPhone's home screen. That waits for #120 and #124. Until then, the daily app is the native Release build, used at home ([Hosting](#hosting)), reinstalled every 7 days on a free Apple account. A lasting native build needs the $99 Apple account for push, HealthKit and installs that last more than 7 days.
- **Offline at the gym.** A Workout can be started, logged and finished with no signal, as today on native ([ADR 0001](adr/0001-history-lives-on-the-server.md), [0003](adr/0003-the-server-builds-planned-workouts.md)).
- **Pounds on screen, kilograms stored.** Vancouver gyms use pound plates and dumbbells.

## Hosting

| Piece      | Production (`main`) | Development (`dev`)                                           |
| ---------- | ------------------- | ------------------------------------------------------------- |
| Web app    | Cloudflare Pages    | Not deployed: Expo on the user's Mac                          |
| API        | Render free service | `pnpm --filter @fit/api dev` on the user's Mac                |
| Database   | Atlas M0            | The database in `apps/api/.env`, kept apart from production's |
| Auth       | Clerk free          | Clerk development instance                                    |
| Scheduling | GitHub Actions cron | Run by hand                                                   |
| Errors     | Sentry free         | None: no DSN locally                                          |

Only `main` is ever deployed. `dev` runs only on the user's Mac, and the phones run Release builds that talk to the API there over Wi-Fi, so each milestone is lived with at home as it lands. This replaced a staging deploy of `dev` on 2026-11-15 (#121, closed). `main` takes only finished milestones.

## Done when, for every milestone

1. Every ticket of the milestone is merged into `dev`, with CI green.
2. Its manual checks pass on the **user's phones**, on Release builds against the API on the Mac, and are recorded in [`manual-checks.md`](manual-checks.md).
3. `dev` is merged into `main`, and production is deployed from it.
4. The milestone's issues are closed by hand, since closing keywords don't fire on `dev`.

## Where M0–M5 stand

M0–M5 are done and in production. M5 was built as spec #77 ([ADR 0004](adr/0004-spec-77-replaces-the-plans-m5.md)) with its gaps (#91–#98, #100) and the fixes from its manual checks (#108–#115), and reached `main` in #118. Its deferred timing checks P9 and S1 are still in [`manual-checks.md`](manual-checks.md).

#99 (conditioning budget) waits for M10. #101 and #105 opened M6.

### Differences from the PDF that were decisions

These were made while building and stay: whole-Workout upload instead of per-Set sync, and a kv-store on the phone instead of Zustand and TanStack Query ([0001](adr/0001-history-lives-on-the-server.md), [0002](adr/0002-previous-sets-are-a-snapshot.md)); gender instead of sex on the profile; one onboarding form; spec #77's M5 in place of the PDF's ([0004](adr/0004-spec-77-replaces-the-plans-m5.md)); Blocks worked out from the latest Assessment rather than stored (#91); a library of about 80 Exercises; CI that checks more than the PDF asked for.

### Drift that this roadmap picks up

| Gap                                                          | Where it's fixed                          |
| ------------------------------------------------------------ | ----------------------------------------- |
| Weeks plan 170–440% of the Weekly Budget                     | M6: the 130% cap                          |
| Working Levels never move after an Assessment                | M6: progression                           |
| The deload week is worked out but nothing reads it           | M6: deload                                |
| RPE is only asked for in Assessment Workouts                 | M6: last-Set RPE                          |
| Check-ins live only on the phone                             | M6: groundwork                            |
| The API has no tests                                         | M6: groundwork                            |
| The web build doesn't work offline                           | M6: groundwork                            |
| Testing on the phone needs a local API, as `main` lags `dev` | Kept: `dev` stays on the Mac (2026-11-15) |
| No body-weight log, no activity level                        | M7                                        |

## Order

**M6 Progression → M7 Nutrition → M8 Daily loop → M12 Progress → M10 Activities → M13 Release-lite.**

M9 Rewards is cut down to PR detection (M6) and a Weekly Streak (M8). M11 Meal planner is cut. The numbers are kept from the PDF so old references still point somewhere.

---

## M6 Progression

**Goal:** the Coach moves each Exercise forward from what the user logs, and the app is fit to train on every day, at home on the phone builds.

### Groundwork (first)

- **PWA offline**, deferred on 2026-11-15 until the web app is picked up again (#120, #124). It starts with a short test that the installed web build, cold-started in airplane mode, opens signed in with Clerk's cached session, as the native build already does. Then a service worker so the web app opens and logs with no signal; the web kv-store moves from `localStorage` to IndexedDB; `navigator.storage.persist()` on first launch; a web manifest so it installs to the home screen.
- ~~**Staging.**~~ Dropped on 2026-11-15: `dev` isn't deployed (#121, closed). See the Hosting table above.
- **Sentry** on the web app and the API.
- **API route tests** against `mongodb-memory-server`, starting with the routes M6 changes.
- **Check-ins on the server.** They upload alongside Workouts and retry the same way; the phone still uses the day's Check-in offline.
- **Library gaps:** #101 (calf raise, Nordic curl, curl, table row) and #105 (jumps).

### Planning

- **A cap of about 130% of the Weekly Budget per Muscle.** The Coach doesn't add an Exercise that would take one of its primary Muscles over the cap; secondary credit counts toward the cap but may go over it. If nothing else is left to add, the Workout ends early: Workout Length becomes a most, not a target, and Today shows the honest estimate ("38 min").
- **Units.** A setting for lb or kg, for display only; the server stores kg.
- **A past Workout.** A Workout can be logged for any of the last 7 days, and counts from that day in the Week Ledger, Fatigue and PRs, so a Workout not logged live doesn't look like a skip. It moves a Working Level only if no later Workout has included that Exercise.
- **Load Steps.** One Load Step is the next load the Equipment Profile has, wherever it lists loads (barbell plates in pairs, dumbbells, kettlebells). Cable and machine, which list none, get a stored step, editable per profile: 10 lb by default, or 5 kg for a kg user. Full gym's built-in loads follow the user's unit (in lb: dumbbells 5–100 lb in 5s, a 45 lb bar and pound plates). Loads are stored as the exact kg of what was entered, so 25 lb always shows as 25 lb.

### Progression ([ADR 0007](adr/0007-progression-and-deload.md))

- **Working Level becomes a load and a target reps** within a rep range: 8–12 by default, 6–10 for barbell lifts, 10–15 for band-only Exercises. `GLOSSARY.md`'s Working Level changes with it.
- **Double progression.** When every Set reaches the top of the range, the next Workout goes up one Load Step, to the reps Epley predicts at the new load, but only if that's at least the bottom of the range; until then reps keep climbing towards 20, as at a load ceiling. A step on light dumbbells or kettlebells can be 14–50% ([research](research/progression-and-deload.md)). Otherwise, when every Set reaches the target, the target goes up 1 rep.
- **Optional RPE on the last Set of each Exercise.** An RPE of 10 holds both the load and the target where they are.
- **Miss and drop.** A Miss is an Exercise whose Sets average more than 2 reps short of target. Two Misses in a row on the same Exercise drop it one Load Step and reset the target to the bottom of the range; if that step is more than about 12% lighter, the load stays and the target drops 2 reps instead. A skipped Workout is not a Miss.
- **Bodyweight and band ladders.** When every Set reaches 15 reps (60 seconds for a timed Exercise), the Coach plans the harder variant next time, its Working Level from Reference Strength, with a reason ("Ready for decline push-ups"). Bands step the same way, light to medium to heavy.
- **Deload week**, the 5th week of a Block: the same Sets, with loads 10% lighter rounded down to a Load Step, and bodyweight, band and timed targets at about 70%, rounded down. Nothing progresses and nothing counts as a Miss.
- **Retest prompt.** In the deload week, Today offers "Retake the Assessment". Ignoring it starts the next Block as usual.
- **No calibration sets.** Every Exercise already gets a Working Level from Reference Strength; the library's integrity test requires every Exercise to have a strength ratio, so a new one can't arrive without one.
- **PRs.** A new best estimated 1RM (Epley, `kg × (1 + reps/30)`, on Sets of 12 reps or fewer) for a loaded Exercise, the heaviest load for 8 reps on a weighted Ballistic Exercise, or most reps or seconds on a bodyweight or timed variant. Carries have none. Found at upload: celebrated on the Finished screen when the upload is immediate; after a late upload, shown on the Workout in History and once as a note on Today. Assessment Sets count; the first Workout on an Exercise doesn't.

### Settled before the spec

- **Which Sets count.** Progression judges the Sets logged, at the lowest load used, if there are at least 2 of them; a load other than the prescribed one becomes the new base. One logged Set moves nothing and isn't a Miss, except for an Exercise done as one Set, which is judged on it. Assessment Workouts set Working Levels, so they don't progress them and hold no Misses; their Sets still count for PRs.
- **Misses** count over consecutive Workouts that include the Exercise, Manual Workouts included. A deload week neither adds a Miss nor resets the count.
- **Bodyweight and timed steps.** The target goes up 1 rep, or 5 seconds, each time every Set reaches it. The ladder's 15 reps replaces today's 20-rep cap for bodyweight Exercises everywhere, seeding included. A timed Miss averages more than 10 seconds short. Two Misses lower a bodyweight target 2 reps and a timed one 10 seconds; the Coach never moves to an easier variant by itself.
- **Ballistic Exercises** keep a fixed target of 8 reps: power needs fast reps well short of failure ([research](research/exercise-selection-by-goal.md#what-survives-8-reps)). A weighted one goes up a Load Step when every Set reaches 8 and the last Set's RPE is 7 or lower, or, with no RPE logged, at most once every 3 Workouts; a bodyweight one, such as a jump, doesn't progress by itself.
- **Carries** take no part in double progression or Misses, as their reps mean nothing. Their Working Level moves only when the user logs a different load.
- **Deload rounding.** Bodyweight and band targets round down to a whole rep, at least 5; timed targets to 5 seconds, at least 15.
- **Load ceilings.** When the next Load Step is beyond the heaviest load a profile has, reps go past the range up to 20; at 20 on every Set the Coach plans the harder variant if the profile can do it, with a reason, or holds at 20 and says so. No tempo.
- **On the server, at upload.** Progression runs in `POST /workouts` before the Planned Workout is rebuilt, so the rebuilt one picks it up. Each Working Level records the Workout that last moved it, so a re-upload or a late Pending Workout never moves it twice or backwards.
- **Each Exercise from its own Sets.** An Alternative Exercise moves its own Working Level, not the planned one's; an easier variant keeps its level after the ladder moves on. Band Sets are assumed to use the band the Working Level names.
- **A retest** sets Working Levels only for the Exercises it tested and those with no logged Sets in the last Block; the rest keep their progressed level ([ADR 0007](adr/0007-progression-and-deload.md)).
- **The simulation's rerun** prints each Muscle's credit against its budget from primary credit alone and in total. If any Muscle's total is still over 160%, the cap comes back for a decision.
- **Migration.** Each stored weighted Working Level becomes the heaviest available load at or below its kg, at the bottom of its range; reps levels are clamped into the new ranges.

**Done when:** the groundwork is built, apart from PWA offline; four weeks of real training show loads and reps moving as the rules say, a deload week, and the retest prompt; the simulation in [`research/planner-simulation.md`](research/planner-simulation.md) is rerun and no Muscle plans above the cap through its primary credit.

## M7 Nutrition

**Goal:** log food quickly against daily targets, with no LLM needed for the core. Grilled on 2026-11-16 to 18; the screens come from the prototype on the `prototype/m7-today-food` branch, variant J.

- **Built for the native app.** The phones' Release builds are the daily app, so barcodes use the Expo camera's own scanner; web gets search, Saved Foods and copy, and barcodes wait for the PWA (#120).
- **Profile:** an Activity Level (sedentary ×1.2, lightly active ×1.375, active ×1.55, very active ×1.725), described by job and daily steps. It covers daily life and strength Workouts, never Activities, so M10 can credit those without counting them twice. Also a Diet, a Weigh-in Day and a fibre target.
- **Weigh-ins, weekly.** One Weigh-in per week (Monday to Sunday), on a Weigh-in Day (Monday by default), asked for on Today that day; a later one that week replaces it, and a missed one can be logged later. The profile shows the latest instead of an editable weight, and onboarding's weight is the first. A Weigh-in never moves Working Levels: body weight is only read at an Assessment.
- **Daily Targets**, the same every day. Mifflin-St Jeor × Activity Level; −20% for lose_fat, +10% for build_muscle, maintenance for recomp and athletic. Protein 2.0 g/kg for lose_fat, build_muscle and recomp, 1.6 g/kg for athletic. Fat at least 0.8 g/kg; carbs fill the rest. Fibre 40 g per 1,000 kcal of the kcal target, which the user can change in Profile. Water 35 ml/kg, rounded to 250 ml.
- **Today:** four equal rings at the very top, for kcal left, protein left, fibre and water. Under them, the Coach's summary of what's left ("1,036 kcal and 54 g of protein left") with a line on how to fill it from Food Ideas. Fibre and water are goals, never nagged. Water is shown, not logged, on Today. Food never changes the Planned Workout; the Check-in covers a bad day.
- **Tabs:** Today · Food · History · Profile. The Exercise library becomes the first row in Profile.
- **Food tab**, in two halves. _Today so far_: the day (today or the 6 before it), three equal rings for kcal, protein and fibre, the water glasses, search and Scan, then the day's meals, Breakfast, Lunch, Dinner and Snacks, each opening to its Food Entries with Add and "Copy from yesterday". _Ideas and recent_: the summary with two Food Ideas to add, the Diet, then Recent and Saved Foods.
- **Water:** a row of 250 ml glasses up to the target, on the Food tab only. Tapping an empty glass adds 250 ml; tapping a filled one takes 250 ml off.
- **Food log.** Each Food Entry keeps a snapshot of the food's kcal, protein, carbs, fat and fibre and the portion, as [ADR 0002](adr/0002-previous-sets-are-a-snapshot.md) does for Sets. Portions in grams, or the food's own servings where the source has them. Logging food needs a connection; there is no offline queue.
- **Finding food:** search on USDA FoodData Central (free key), generic foods (Foundation and SR Legacy) first and branded after; barcodes on Open Food Facts, then USDA's branded data by UPC. When neither has it, Create food from the label makes a Saved Food, linked to the barcode so the next scan finds it. Recent is the user's own log, most recent first. "Copy from yesterday" copies one meal into the same meal, after what's there. The Canadian Nutrient File only if gaps show up.
- **Food Ideas:** a list of about 40 high-protein foods shipped with the app, each with a set portion and tagged meat, fish, vegetarian or vegan. The Coach offers the two with the most protein per kcal that fit in the kcal left and that the Diet allows (any, pescatarian, vegetarian or vegan, plus foods to avoid: dairy, gluten, nuts, pork). Add puts one in the meal for the time of day: Breakfast before 11, Lunch before 4 pm, Dinner before 9 pm, Snacks after. Once protein is met, ideas stop. Search and barcodes are never filtered by the Diet.
- **Daily totals** are worked out when needed, not stored, until M8's weekly review needs them stored.
- **Tell the coach (last ticket; may move to M8 without holding up M7):** a text box on Today. "Yesterday I had two eggs and toast" becomes dated Food Entries through a provider-agnostic interface, on Gemini Flash's free tier, with a confirm screen and a portion slider. Food descriptions only, never photos. M10 extends the same box to Activities.
- **API keys stay on the server;** the API proxies USDA and Gemini.

**Done when:** two weeks of real eating logged on the phones' Release builds, mostly by barcode, Saved Foods and copy; targets look right against the user's own numbers.

## M8 Daily loop

**Goal:** the app reaches out at the right time with something useful. See [ADR 0006](adr/0006-scheduled-jobs-through-github-actions.md).

- **Web push.** VAPID keys on the server, a subscription saved per device. iOS only delivers it to the installed PWA (iOS 16.4+).
- **Scheduled jobs.** A GitHub Actions workflow runs hourly and POSTs to `/jobs/run` with a secret. That wakes the Render instance, which, for each user, runs whatever is due in that user's timezone and records that it ran, so a late or repeated call never sends twice. Agenda is dropped.
- **Evening summary, due at 6 pm so it arrives by 7, templated:** "Push day done ✅ · 1,840 / 2,300 kcal · 120 g protein · Tomorrow: Legs, Standard", or "Tomorrow: Rest Day · next up Legs" when the Rest Day rule says so, with tomorrow's kcal and protein targets. It says "tomorrow" again ([ADR 0008](adr/0008-a-few-invited-users-and-tomorrow.md) reverses that part of [0004](adr/0004-spec-77-replaces-the-plans-m5.md)).
- **Sunday weekly review**, in the app and announced by push: Workouts done against planned and the Weekly Streak; the Weekly Budget met per Muscle; PRs and Exercises that progressed or dropped; average kcal and protein against target; the change since last week's Weigh-in; the Readiness trend from Check-ins.
- **Weekly Streak.** A week counts when the user finishes at least `daysPerWeek − 1` Workouts, Recovery Workouts included. No freezes. Weeks run Monday to Sunday, as the Week Ledger does.
- The PDF's event bus is dropped unless the spec finds a need. An LLM sentence in the summary is optional, through M7's interface.

**Done when:** two weeks of evening summaries and two Sunday reviews arrive on the phone, on time to within about an hour, with no duplicates.

## M12 Progress

**Goal:** see whether it's working, over months.

- **Weight trend:** the weekly Weigh-ins over time.
- **Adaptive TDEE:** once 4 Weigh-ins and the intake between them exist, it replaces the activity level in the targets.
- **Strength graph:** estimated 1RM per Exercise over time, with the Working Level line; the user picks from Exercises they've done.
- **Assessment against retest:** the same chart with Block boundaries marked.

**Done when:** the graphs match the user's real data from M6 and M7, and the adaptive TDEE gives a plausible number from it.

## M10 Activities

**Goal:** training outside the app counts.

- **Manual Activities:** type (run, ride, hike, swim, sport, other), duration and effort, for today or an earlier day. Each type adds Fatigue to set Muscles (a run to quads, hamstrings and calves) from the day it was done and credits the Week Ledger, and #99's conditioning budget is built here. Half the estimated kcal is credited to the day's target. Logging one replans the Planned Workout, so "yesterday I ran 10k" changes today's.
- **Rest Day after a hard Activity.** The Rest Day rule gains a hard Activity yesterday, so the Coach can recommend resting, not just a different Workout.
- **Tell the coach, for Activities.** M7's text box also turns "yesterday I ran 10k" into a dated Activity, behind the same confirm screen. This reverses the earlier plan to drop LLM parsing of Activities ([ADR 0008](adr/0008-a-few-invited-users-and-tomorrow.md)); the form still works without it.
- **Strava import (second half).** Strava's API is free, and an Apple Watch can sync to Strava, which is the free way in for watch data.

### Open for the spec

- The table from Activity type and effort to Muscles and credited Sets.
- What counts as a hard Activity for the Rest Day rule.
- Strava: webhooks into a sleeping Render instance, or polling from the M8 cron.

**Done when:** a week with runs or rides, logged and imported, changes the Planned Workouts as expected.

## M13 Release-lite

**Goal:** the app is finished, and its author invites one or two others.

- Icon, splash and manifest polish.
- An export of all of a user's data as JSON.
- A script that deletes all of a user's data, and their Clerk user.
- **Invites.** Sign-up restricted by Clerk's allowlist on production; each invited user onboards with their own profile, equipment and timezone ([ADR 0008](adr/0008-a-few-invited-users-and-tomorrow.md)).

Demo videos, TestFlight, Play and GDPR flows are dropped, and Sentry moved to M6.

**Done when:** production on `main` is the daily app, and an export restores to a fresh database.

---

## Cut, or someday

- **M9 Rewards:** XP, levels, streak freezes and achievements, cut. PRs and the Weekly Streak stay.
- **M11 Meal planner:** recipes, the LP solver, substitutions, weekly plans and shopping lists, cut.
- **Someday:** progress photos; photo meal logging; the native iOS app with push and Apple Health, on a paid Apple account; Health Connect; the Canadian Nutrient File.

## Risks to watch

- **Render's free API sleeps** after 15 minutes and takes about 50 seconds to wake. Offline-first hides it for logging; Today should show the cached Planned Workout while it wakes.
- **Expo has no service worker of its own**, so M6's offline ticket adds a build step (Workbox or similar). Clerk must also let the app open offline with the cached session.
- **GitHub Actions minutes.** The repository is private, with 2,000 free minutes a month, and each run bills at least a minute. An hourly cron for production is about 725 minutes, alongside CI. If that's too tight, the cron runs only in the evening hours. It can also run late.
- **Gemini's free tier** can change its terms or limits, and has to cover three users' "Tell the coach" boxes; the provider interface keeps it swappable, and M7's core doesn't need it.
- **iOS can clear a PWA's storage** under pressure. History on the server and `storage.persist()` limit the loss to Pending Workouts.
- **Atlas M0** has 512 MB, plenty for one user, even with a development database beside production's.
