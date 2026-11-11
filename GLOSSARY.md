# Fit Coach

A training app for its author and a few invited people. You tell the Coach what you did and ate, and it coaches you through strength workouts with the equipment you actually have, around everything else you do.

## Language

### Training

**Load Type**:
How an Exercise is measured: by external weight, by bodyweight, or by time held.
_Avoid_: Exercise type, measure

**Exercise**:
A movement in the library, such as a goblet squat, with how it is loaded, the muscles it works and its easier and harder variants.
_Avoid_: Movement, lift

**Recovery Exercise**:
A walk or a mobility hold, made for the Recovery Workout. It has no Pattern, credits no Muscle, and the Coach never plans one into a training Workout.
_Avoid_: Stretch, mobility exercise, cooldown

**Pattern**:
The kind of movement an Exercise trains: squat, hinge, push, pull, carry or core.
_Avoid_: Movement pattern, category

**Ballistic Exercise**:
An Exercise where the load or the body is accelerated through the end of the movement, such as a swing or a jump.
_Avoid_: Explosive exercise, power exercise

**Jump**:
A bodyweight Ballistic Exercise, for the athletic Goal only and behind its Include jumps switch. Its dose is **contacts**, the landings in a Set: a fixed number set by its place on the jump ladder, halved in the deload week. It has no Working Level and doesn't progress by itself, and a Set credits 0.5 to quads and glutes only.
_Avoid_: Plyo, plyometric (for the Exercise); reps (for its contacts)

**Superset**:
Two Exercises of a Workout done in turn, a Set of one then a Set of the other with no rest between, and a rest only after the pair. The phone pairs them only when a Workout wouldn't otherwise fit its Length, by each one's main Pattern: push with pull, squat with core, hinge with push. Each Set is still logged under its own Exercise.
_Avoid_: Circuit, paired set

**Workout**:
One occasion when the user trained, from start to finish, made up of the exercises they did in the order they did them.
_Avoid_: Session, training session

**Workout Exercise**:
One library Exercise as done within a particular Workout, holding the Sets the user did of it.
_Avoid_: Logged exercise, exercise entry

**Set**:
One continuous effort of a Workout Exercise: kg and reps for a weighted Exercise, reps for a bodyweight one (contacts for a Jump), or seconds for a timed one, optionally with its RPE. For a one-sided Exercise the values are per side.
_Avoid_: Round, attempt

**RPE**:
How hard a Set felt, from 6 to 10, where 10 means no more reps were possible and 9 means one more was.
_Avoid_: Effort, difficulty, intensity

**Volume**:
The total weight moved: kg × reps summed over weighted Sets, doubled for a one-sided Exercise. Bodyweight and timed Sets add nothing to it.
_Avoid_: Tonnage, load, work

**Previous Sets**:
The Sets the user did of the same Exercise in their most recent finished Workout that included it, Pending Workouts included, shown as a reference while logging. A variant counts as a different Exercise; if the Exercise appeared twice in that Workout, the later one counts.
_Avoid_: Last time, previous performance, history (for this)

**History**:
The user's finished Workouts, newest first.
_Avoid_: Log, journal, activity

**In-progress Workout**:
The Workout the user has started but not yet finished; there is at most one at a time. Finishing it makes it a Pending Workout.
_Avoid_: Active workout, current workout, draft workout

**Pending Workout**:
A finished Workout that hasn't reached the server yet.
_Avoid_: Unsynced workout, queued workout, offline workout

**Coach**:
The app itself, deciding what the user should train; there is no human coach.
_Avoid_: Trainer, AI coach, Plan (when meaning the coach)

**Goal**:
What the user is training for: losing fat, building muscle, recomposition, or athletic performance.
_Avoid_: Plan, objective, program

**Manual Workout**:
A Workout whose exercises the user chose themselves, rather than having them prescribed by the coach.
_Avoid_: Custom workout, freestyle workout

### Planning

**Planned Workout**:
What the Coach prescribes for the user's next training day, built for their primary Equipment Profile: the Exercises in priority order, their Sets and targets, at Long, with the Alternative Exercises for Full gym and Bodyweight only. There is one current at a time. It's rebuilt after an upload, on a new day, after an Assessment and after a change to the Profile fields it depends on. A rebuild that gives the same plan keeps it; otherwise the old one is kept, marked finished or replaced. Starting it begins a Workout linked to it.
_Avoid_: Session, planned session, program

**Day's Workout**:
The Workout on offer today: the Planned Workout on the Workout Length and equipment chosen for it, cut to fit, with its estimated time and any Exercise with no alternative left out. Choices stay on the phone, last for one Workout and never change the Planned Workout.
_Avoid_: Today's session, adjusted plan

**Weekly Budget**:
How many credited Sets each of the budgeted Muscles should get in a week, set by the user's Goal and days per week. Workout Length decides how much of it is delivered, not the budget itself. Eight Muscles are budgeted for every Goal, and calves too for athletic and build_muscle; other Muscles aren't budgeted. The Coach plans a Muscle up to a cap of about 130% of its budget, counted from the Week Ledger and the Sets already planned: it adds no Exercise that would take one of its primary Muscles over it, while secondary credit counts towards a Muscle's total but never keeps an Exercise out.
_Avoid_: Weekly target, quota, weekly volume

**Week Ledger**:
The credited Sets each Muscle has had so far this week, counted from the Sets the user logged and read against the Weekly Budget. A Set credits 1 to each primary Muscle and 0.5 to each secondary, a Jump's 0.5 to quads and glutes only, and a one-sided Set counts once. Weeks run Monday to Sunday in the user's timezone.
_Avoid_: Tally, weekly progress

**Fatigue**:
How much recent training a Muscle is still carrying: each logged Set credits it as in the Week Ledger, in full when logged and fading in a straight line to nothing after 48 hours. The Coach leaves out an Exercise while any of its primary Muscles is over the limit of 4, unless nothing else helps the Weekly Budget. Those Muscles are held back.
_Avoid_: Recovery score; soreness and readiness, which are the user's own Check-in

**Check-in**:
How the user says they feel on a day, before training: sleep, energy and soreness, each rated 1 to 5. It lasts for that day only.
_Avoid_: Daily survey, wellness check, mood

**Readiness**:
How ready to train a Check-in says the user is: sleep + energy + (6 − soreness), from 3 to 15. Low Readiness keeps fewer of the Day's Workout's Sets, and soreness 5 always keeps fewer, however good sleep and energy were.
_Avoid_: Recovery score, fatigue (for this)

**Equipment Profile**:
A named set of equipment the user trains with, and the loads it makes. One is primary. Full gym and Bodyweight only always exist, without the user creating them, for a day when the usual equipment isn't available.
_Avoid_: Gym setup, kit, mode

**Alternative Exercise**:
An Exercise the Coach suggests in place of a planned one that can't be done on Full gym or Bodyweight only, for one Workout. An Exercise that's still possible stays. Each has up to 3 options, the first chosen by default, with the same Sets and its own target.
_Avoid_: Substitute, swap, replacement

**Workout Length**:
The most the user wants a Workout to take, 5 minutes of warm-up included: Short (30 minutes), Standard (45) or Long (60), or Quick (20), which is only for one Workout. It's a most, not a target: once nothing is left to add under the 130% cap, the Workout ends short of it, and Today shows the real estimate. They choose their usual one during onboarding, can change it in Profile, and can change it for a single Workout. A user with none stored counts as Standard.
_Avoid_: Mode, session type

**Recovery Workout**:
A walk or mobility Workout the user chooses in place of the Day's Workout, for one day. Unlike a Rest Day, it's something they do. It credits no Sets.
_Avoid_: Recovery day, recovery session

**Block**:
A run of weeks of training, started by an Assessment, with a set length and a deload week. A newer Assessment starts a new one; without one, the next starts the week after the deload.
_Avoid_: Program, mesocycle, cycle

**Rest Day**:
A day the Coach recommends not training: the user has trained today, or reached their days per week, or trained or did a hard Activity yesterday and the week's other Workouts still fit. It's advice, shown above the Planned Workout.
_Avoid_: Off day, recovery day

### Assessment

**Assessment Workout**:
One of the two Workouts the Coach prescribes to measure the user's starting strength: A tests squat, hinge and core, B tests push and pull.
_Avoid_: Test session, baseline session, test workout

**Assessment**:
The results of one completed pair of Assessment Workouts: for each tested Pattern, the Exercise used, its top Set, the maximum estimated from it and the Reference Strength that follows. A test is load-limited when the heaviest load available couldn't reach RPE 9, so its maximum is only a lower bound. A bodyweight or timed test is one Set of as many reps or seconds as the user can do. A Pattern is untested when no test was safe for the user's injuries or its weighted test stopped short of RPE 9; its Reference Strength is then estimated from the other Patterns. The newest Assessment is the one that counts.
_Avoid_: Baseline, test results, fitness test

**Working Level**:
What the Coach will prescribe next for one Exercise for this user: kg for 8 reps for a weighted Exercise, a band level and reps for a band Exercise, reps for a bodyweight one, seconds for a timed one. An Assessment sets the first one.
_Avoid_: Exercise state, starting load, current weight

**Reference Strength**:
The user's estimated one-rep maximum in kg on a Pattern's barbell lift (for core, the seconds they can hold a plank), from which the Working Levels of every Exercise in that Pattern follow.
_Avoid_: Strength score, base e1RM

### Progression

**Load Step**:
The move from one load to the next an Equipment Profile has for one kind of equipment, such as from the 25 lb to the 30 lb dumbbells, or a set step for cable and machine. Progression moves a weighted Exercise up or down one Load Step at a time.
_Avoid_: Increment, jump, plate step

**Miss**:
A Workout in which an Exercise's Sets average more than 2 reps, or 10 seconds, short of their target. Two in a row, counted over the Workouts that include that Exercise, drop it a Load Step, or lower a bodyweight or timed target. A skipped Workout isn't one, and nothing in a deload week is, though a deload week doesn't break the run either.
_Avoid_: Failure, failed set, stall

**PR**:
A new best on an Exercise: the highest estimated one-rep maximum for a weighted one, from Sets of 12 reps or fewer, the heaviest load for 8 reps for a weighted Ballistic Exercise, or the most reps or seconds for a bodyweight or timed variant. A carry has none. The first Workout on an Exercise sets a baseline, not a PR.
_Avoid_: Personal best, record, PB

**Weekly Streak**:
How many weeks in a row the user has finished at least one fewer Workout than their days per week, Recovery Workouts included. Weeks run Monday to Sunday, as the Week Ledger does.
_Avoid_: Streak (alone), consistency score

### Nutrition and activity

**Food Entry**:
One food the user ate, in a meal of a day: the portion and a snapshot of that food's calories and macros when it was logged, so a later change to the food doesn't change the day.
_Avoid_: Meal log, food log item, intake

**Activity**:
Training done outside the app, such as a run, a ride or a game of a sport: its type, duration and effort, logged by hand, told to the Coach or imported from Strava, on the day it was done. It adds Fatigue to the Muscles its type works and credits part of its calories to the day.
_Avoid_: Cardio, exercise (for this), conditioning session
