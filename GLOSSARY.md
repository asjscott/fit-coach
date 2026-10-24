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

**Workout**:
One occasion when the user trained, from start to finish, made up of the exercises they did in the order they did them.
_Avoid_: Session, training session

**Workout Exercise**:
One library Exercise as done within a particular Workout, holding the Sets the user did of it.
_Avoid_: Logged exercise, exercise entry

**Set**:
One continuous effort of a Workout Exercise: kg and reps for a weighted Exercise, reps for a bodyweight one, or seconds for a timed one. For a one-sided Exercise the values are per side.
_Avoid_: Round, attempt

**History**:
The user's finished Workouts, newest first.
_Avoid_: Log, journal, activity

**In-progress Workout**:
The Workout the user has started but not yet finished; there is at most one at a time. Finishing it makes it a Pending Workout.
_Avoid_: Active workout, current workout, draft workout

**Pending Workout**:
A finished Workout that hasn't reached the server yet.
_Avoid_: Unsynced workout, queued workout, offline workout

**Manual Workout**:
A Workout whose exercises the user chose themselves, rather than having them prescribed by the coach.
_Avoid_: Custom workout, freestyle workout
