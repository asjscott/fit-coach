# The server builds Planned Workouts

`planWorkout` is pure and lives in `@fit/engines`, which also runs on the phone, but only the server calls it. Building a Planned Workout needs the Week Ledger, and [0001](0001-history-lives-on-the-server.md) keeps History off the phone, so the phone can't count a week's Sets. The API loads the data, calls `planWorkout` and saves the result. The phone keeps a copy of the latest Planned Workout so it can be started offline, as a snapshot in the spirit of [0002](0002-previous-sets-are-a-snapshot.md).

## Consequences

- After a Workout is finished offline, the copy is out of date, so Today shows "Connect to plan your next Workout" until the upload succeeds. The phone never shows a plan it knows is stale.
- The server has no other reason to know the user's timezone, but weeks run Monday to Sunday in the phone's local time, so the phone sends its timezone for the Week Ledger to use the same Monday as Today.
- The server also works out Alternative Exercises and their Working Levels when it builds a plan, and saves them inside the Planned Workout, so training somewhere else works with no signal.
- The server always builds the Long version, in priority order, and the phone cuts it to the Workout Length. Changing the Length for one Workout therefore works offline, and needs no separate plan per Length and equipment.
- Planned Workouts are kept, marked finished or replaced, so a Workout started offline can still link to a plan that was replaced while it ran.

## Considered Options

- **Plan on the phone**: works offline after every Workout, but needs a copy of the week's Workouts on the phone, which reopens the sync and delete problems 0001 rejected.
