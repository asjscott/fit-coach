# Roadmap

This is the plan of record from M6 to the end. It replaces the Build plan PDF, archived at [`archive/build-plan-v1.pdf`](archive/build-plan-v1.pdf), which still describes the old M5 and a product for many users on the app stores. Where the two differ, this file wins; for words, [`GLOSSARY.md`](../GLOSSARY.md) and the ADRs in [`adr/`](adr/) win over both.

The detail here is kept brief on purpose. Each milestone gets its own spec issue when it starts, like #77, and is split into tickets from there. The spec may refine anything below; it should say so when it reverses a decision.

## What we're building

Fit Coach is a personal trainer for its author, in Vancouver, BC, and one or two people they invite. You tell the Coach what you did and ate, today or yesterday, and it tells you what to do today or tomorrow. The Coach plans each strength Workout from the equipment on hand, the week so far, other activities like runs and rides, and how the user feels, then moves each Exercise forward as the user gets stronger. Around that it adds the things that decide whether training works: food logged against targets with a nudge on what's left, body weight, a summary each evening that says what tomorrow holds, a review each Sunday, and a view of progress over months.

Structured logging is the backbone: Sets are logged live, offline, as progression needs them exact. A "Tell the coach" text box on Today ("yesterday I ran 10k, had eggs and toast") is the quick way in, and becomes dated Food Entries and Activities behind a confirm screen. See [ADR 0008](adr/0008-a-few-invited-users-and-tomorrow.md).

It is not a product for the public. Sign-up is invite-only, and there are no app stores, no GDPR flows and no growth features like XP or achievements. Each user's data is their own, so no spec may assume a single user.

## Constraints

- **Free, or very close to it.** No paid Apple Developer account, no paid hosting, no paid LLM by default. See [ADR 0005](adr/0005-free-tier-and-the-pwa-first.md).
- **The installed web app (PWA) is the daily app.** The Expo web build, added to the iPhone's home screen. The native iOS build keeps compiling in CI, but is "someday": it needs the $99 Apple account for push, HealthKit and installs that last more than 7 days.
- **Offline at the gym.** A Workout can be started, logged and finished with no signal, as today on native ([ADR 0001](adr/0001-history-lives-on-the-server.md), [0003](adr/0003-the-server-builds-planned-workouts.md)).
- **Pounds on screen, kilograms stored.** Vancouver gyms use pound plates and dumbbells.

## Hosting

| Piece      | Production (`main`) | Staging (`dev`)                    |
| ---------- | ------------------- | ---------------------------------- |
| Web app    | Cloudflare Pages    | Cloudflare Pages branch deploy     |
| API        | Render free service | A second Render free service       |
| Database   | Atlas M0            | A separate database on the same M0 |
| Auth       | Clerk free          | Clerk development instance         |
| Scheduling | GitHub Actions cron | The same workflow, against staging |
| Errors     | Sentry free         | Sentry free, its own environment   |

The staging deploy is the one the user trains on day to day, so each milestone is lived with as it lands. `main` stays the stable fallback and takes only finished milestones.

## Done when, for every milestone

1. Every ticket of the milestone is merged into `dev`, with CI green.
2. Its manual checks pass on the **installed PWA on the user's iPhone**, against staging, and are recorded in [`manual-checks.md`](manual-checks.md).
3. `dev` is merged into `main`, and production is deployed from it.
4. The milestone's issues are closed by hand, since closing keywords don't fire on `dev`.

## Where M0–M5 stand

M0–M4 are done. M5 is built as spec #77 ([ADR 0004](adr/0004-spec-77-replaces-the-plans-m5.md)) and its gaps (#91–#98, #100) are merged, but it isn't finished:

- The fixes from the manual checks' notes, #108–#114, tracked by #115.
- The deferred timing checks P9 and S1, and the end-to-end check #87.
- `main` and Render are still on M4, so M5 isn't in production.
- Issues #77–#115 are open and close by hand once M5 reaches `main`.

M5 finishes before M6 starts. #99 (conditioning budget) waits for M10, and #101 and #105 open M6.

### Differences from the PDF that were decisions

These were made while building and stay: whole-Workout upload instead of per-Set sync, and a kv-store on the phone instead of Zustand and TanStack Query ([0001](adr/0001-history-lives-on-the-server.md), [0002](adr/0002-previous-sets-are-a-snapshot.md)); gender instead of sex on the profile; one onboarding form; spec #77's M5 in place of the PDF's ([0004](adr/0004-spec-77-replaces-the-plans-m5.md)); Blocks worked out from the latest Assessment rather than stored (#91); a library of about 80 Exercises; CI that checks more than the PDF asked for.

### Drift that this roadmap picks up

| Gap                                                          | Where it's fixed |
| ------------------------------------------------------------ | ---------------- |
| Weeks plan 170–440% of the Weekly Budget                     | M6: the 130% cap |
| Working Levels never move after an Assessment                | M6: progression  |
| The deload week is worked out but nothing reads it           | M6: deload       |
| RPE is only asked for in Assessment Workouts                 | M6: last-Set RPE |
| Check-ins live only on the phone                             | M6: groundwork   |
| The API has no tests                                         | M6: groundwork   |
| The web build doesn't work offline                           | M6: groundwork   |
| Testing on the phone needs a local API, as `main` lags `dev` | M6: staging      |
| No body-weight log, no activity level                        | M7               |

## Order

**M6 Progression → M7 Nutrition → M8 Daily loop → M12 Progress → M10 Activities → M13 Release-lite.**

M9 Rewards is cut down to PR detection (M6) and a Weekly Streak (M8). M11 Meal planner is cut. The numbers are kept from the PDF so old references still point somewhere.

---

## M6 Progression

**Goal:** the Coach moves each Exercise forward from what the user logs, and the app is fit to train on every day as a PWA.

### Groundwork (first)

- **PWA offline.** A service worker so the web app opens and logs with no signal; the web kv-store moves from `localStorage` to IndexedDB; `navigator.storage.persist()` on first launch; a web manifest so it installs to the home screen.
- **Staging.** The `dev` deploys in the Hosting table above.
- **Sentry** on the web app and the API.
- **API route tests** against `mongodb-memory-server`, starting with the routes M6 changes.
- **Check-ins on the server.** They upload alongside Workouts and retry the same way; the phone still uses the day's Check-in offline.
- **Library gaps:** #101 (calf raise, Nordic curl, curl, table row) and #105 (jumps).

### Planning

- **A cap of about 130% of the Weekly Budget per Muscle.** The Coach stops adding Sets for a Muscle at the cap. If nothing else is left to add, the Workout ends early: Workout Length becomes a most, not a target, and Today shows the honest estimate ("38 min").
- **Units.** A setting for lb or kg, for display only; the server stores kg.
- **A past Workout.** A Manual Workout can be logged for an earlier day, and counts from that day in the Week Ledger, Fatigue and progression, so a Workout not logged live doesn't look like a skip.
- **Load Steps.** Each loadable kind of equipment in an Equipment Profile has a step, editable per profile. Defaults: barbell 5 lb, dumbbells 5 lb, cable and machine 10 lb.

### Progression ([ADR 0007](adr/0007-progression-and-deload.md))

- **Working Level becomes a load and a target reps** within a rep range: 8–12 by default, 6–10 for barbell lifts, 10–15 for band-only Exercises. `GLOSSARY.md`'s Working Level changes with it.
- **Double progression.** When every Set reaches the top of the range, the next Workout goes up one Load Step and back to the bottom of the range. Otherwise, when every Set reaches the target, the target goes up 1 rep.
- **Optional RPE on the last Set of each Exercise.** An RPE of 10 holds the load where it is.
- **Miss and drop.** A Miss is an Exercise whose Sets average more than 2 reps short of target. Two Misses in a row on the same Exercise drop it one Load Step (about 10%) and reset the target to the bottom of the range. A skipped Workout is not a Miss.
- **Bodyweight and band ladders.** When every Set reaches 15 reps (60 seconds for a timed Exercise), the Coach plans the harder variant next time, its Working Level from Reference Strength, with a reason ("Ready for decline push-ups"). Bands step the same way, light to medium to heavy.
- **Deload week**, the 5th week of a Block: the same Sets, with loads 10% lighter rounded down to a Load Step, and bodyweight, band and timed targets at about 70%, rounded down. Nothing progresses and nothing counts as a Miss.
- **Retest prompt.** In the deload week, Today offers "Retake the Assessment". Ignoring it starts the next Block as usual.
- **No calibration sets.** Every Exercise already gets a Working Level from Reference Strength; the library's integrity test requires every Exercise to have a strength ratio, so a new one can't arrive without one.
- **PRs.** A new best estimated 1RM (Epley, `kg × (1 + reps/30)`, on Sets of 12 reps or fewer) for a loaded Exercise, or most reps or seconds on a bodyweight or timed variant. Found at upload, celebrated on the Finished screen. Assessment Sets count; the first Workout on an Exercise doesn't.

### Open for the spec

- **Load ceilings.** What happens when the next Load Step is above the heaviest load a profile has: reps beyond the range, the harder variant, slower tempo, or a mix.
- Whether Working Levels move on the server at upload (likely, as History is there) and how a replaced Planned Workout picks them up.
- How a change of variant by hand, or an Alternative Exercise, feeds back into Working Levels.

**Done when:** the groundwork is live on staging; four weeks of real training show loads and reps moving as the rules say, a deload week, and the retest prompt; the simulation in [`research/planner-simulation.md`](research/planner-simulation.md) is rerun and no Muscle plans above the cap.

## M7 Nutrition

**Goal:** log food quickly against daily targets, with no LLM needed for the core.

- **Profile:** a new activity level (4 options).
- **Weight log.** A quick "Log weight" on Today and a `weights` collection; the profile's weight follows the latest entry.
- **Targets.** Mifflin-St Jeor × activity level; −20% for lose_fat, +10% for build_muscle, maintenance otherwise. Protein 2.0 g/kg for lose_fat and build_muscle, 1.6 g/kg otherwise. Fat at least 0.8 g/kg; carbs fill the rest.
- **Home bars** on Today for kcal and protein against target, with a nudge on what's left ("60 g of protein to go"). Food never changes the Planned Workout; the Check-in covers a bad day.
- **Food log.** One list per day, in Breakfast, Lunch, Dinner and Snacks, for today or an earlier day. Each Food Entry keeps a snapshot of the food's macros and the portion, as [ADR 0002](adr/0002-previous-sets-are-a-snapshot.md) does for Sets.
- **Finding food:** search on USDA FoodData Central (free key), barcodes on Open Food Facts (free, no key), saved foods, and "copy yesterday's meal". The Canadian Nutrient File only if gaps show up.
- **Daily totals** are worked out when needed, not stored, until M8's weekly review needs them stored.
- **Tell the coach (last):** a text box on Today. "Yesterday I had two eggs and toast" becomes dated Food Entries through a provider-agnostic interface, on Gemini Flash's free tier, with a confirm screen and a portion slider. Food descriptions only, never photos. M10 extends the same box to Activities.

### Open for the spec

- Barcode scanning in iOS Safari, which has no `BarcodeDetector`: likely a JavaScript decoder such as ZXing. Check it works in the installed PWA's camera.
- API keys stay on the server; the API proxies USDA and Gemini.
- Logging food offline: queue it like Pending Workouts, or require a connection.

**Done when:** two weeks of real eating logged on the PWA, mostly by barcode, saved foods and copy; targets look right against the user's own numbers.

## M8 Daily loop

**Goal:** the app reaches out at the right time with something useful. See [ADR 0006](adr/0006-scheduled-jobs-through-github-actions.md).

- **Web push.** VAPID keys on the server, a subscription saved per device. iOS only delivers it to the installed PWA (iOS 16.4+).
- **Scheduled jobs.** A GitHub Actions workflow runs hourly and POSTs to `/jobs/run` with a secret. That wakes the Render instance, which, for each user, runs whatever is due in that user's timezone and records that it ran, so a late or repeated call never sends twice. Agenda is dropped.
- **Evening summary, due at 6 pm so it arrives by 7, templated:** "Push day done ✅ · 1,840 / 2,300 kcal · 120 g protein · Tomorrow: Legs, Standard", or "Tomorrow: Rest Day · next up Legs" when the Rest Day rule says so, with tomorrow's kcal and protein targets. It says "tomorrow" again ([ADR 0008](adr/0008-a-few-invited-users-and-tomorrow.md) reverses that part of [0004](adr/0004-spec-77-replaces-the-plans-m5.md)).
- **Sunday weekly review**, in the app and announced by push: Workouts done against planned and the Weekly Streak; the Weekly Budget met per Muscle; PRs and Exercises that progressed or dropped; average kcal and protein against target; the 7-day average weight change; the Readiness trend from Check-ins.
- **Weekly Streak.** A week counts when the user finishes at least `daysPerWeek − 1` Workouts, Recovery Workouts included. No freezes. Weeks run Monday to Sunday, as the Week Ledger does.
- The PDF's event bus is dropped unless the spec finds a need. An LLM sentence in the summary is optional, through M7's interface.

**Done when:** two weeks of evening summaries and two Sunday reviews arrive on the phone, on time to within about an hour, with no duplicates.

## M12 Progress

**Goal:** see whether it's working, over months.

- **Weight trend:** the 7-day average against daily entries.
- **Adaptive TDEE:** once 3 weeks of weight and intake data exist, it replaces the activity level in the targets.
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
- **GitHub Actions minutes.** The repository is private, with 2,000 free minutes a month, and each run bills at least a minute. An hourly cron for production and staging is about 1,450 minutes, alongside CI. If that's too tight, the cron runs only in the evening hours. It can also run late.
- **Gemini's free tier** can change its terms or limits, and has to cover three users' "Tell the coach" boxes; the provider interface keeps it swappable, and M7's core doesn't need it.
- **iOS can clear a PWA's storage** under pressure. History on the server and `storage.persist()` limit the loss to Pending Workouts.
- **Atlas M0** has 512 MB, plenty for one user, but staging shares it.
