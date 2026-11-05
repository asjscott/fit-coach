# Fit Coach

A training app that coaches people through strength workouts using the equipment they actually have.

## Language

### Training

**Load Type**:
How an Exercise is measured: by external weight, by bodyweight, or by time held.
_Avoid_: Exercise type, measure

**Exercise**:
A movement in the library, such as a goblet squat, with how it is loaded, the muscles it works and its easier and harder variants.
_Avoid_: Movement, lift

**Pattern**:
The kind of movement an Exercise trains: squat, hinge, push, pull, carry or core.
_Avoid_: Movement pattern, category

**Ballistic Exercise**:
An Exercise where the load or the body is accelerated through the end of the movement, such as a swing or a jump.
_Avoid_: Explosive exercise, power exercise

**Workout**:
One occasion when the user trained, from start to finish, made up of the exercises they did in the order they did them.
_Avoid_: Session, training session

**Workout Exercise**:
One library Exercise as done within a particular Workout, holding the Sets the user did of it.
_Avoid_: Logged exercise, exercise entry

**Set**:
One continuous effort of a Workout Exercise: kg and reps for a weighted Exercise, reps for a bodyweight one, or seconds for a timed one, optionally with its RPE. For a one-sided Exercise the values are per side.
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
What the Coach prescribes for the user's next training day, built for their primary Equipment Profile: the Exercises and their Sets, not yet started. There is one at a time, and starting it begins a Workout linked to it.
_Avoid_: Session, planned session, program

**Weekly Budget**:
How many Sets each Muscle should get in a week, set by the user's Goal and days per week.
_Avoid_: Weekly target, quota, weekly volume

**Week Ledger**:
The Sets each Muscle has had so far this week, counted from the Sets the user logged and read against the Weekly Budget.
_Avoid_: Tally, weekly progress

**Equipment Profile**:
A named set of equipment the user trains with, and the loads it makes. One is primary. Full gym and Bodyweight only always exist, without the user creating them, for a day when the usual equipment isn't available.
_Avoid_: Gym setup, kit, mode

**Alternative Exercise**:
An Exercise the Coach suggests in place of a planned one when the user trains without their primary Equipment Profile for a Workout.
_Avoid_: Substitute, swap, replacement

**Workout Length**:
How long the user wants a Workout to take: Short (30 minutes), Standard (45) or Long (60). They choose one during onboarding, and can change it for a single Workout.
_Avoid_: Mode, session type

**Rest Day**:
A day the Coach recommends not training.
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
