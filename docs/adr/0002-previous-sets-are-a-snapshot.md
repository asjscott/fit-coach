# Previous Sets are a read-only snapshot saved with the In-progress Workout

Previous Sets have to stay visible when the signal drops mid-Workout, but [0001](0001-history-lives-on-the-server.md) keeps History off the phone. So when an Exercise is added to the In-progress Workout, its Previous Sets are fetched (if online) and saved with that Workout. The copy is read-only, never synced or merged, and goes when the Workout finishes. It doesn't reopen 0001, because there is nothing to keep in step with the server: a deleted or stale source Workout just means a slightly out-of-date reference for one Workout. Pending Workouts on the phone are checked too, since one can be newer than anything on the server.

## Considered Options

- **Fetch on demand, online only**: no copy on the phone, but Previous Sets vanish exactly when signal drops, which is common where people train.
- **Cache recent History on the phone**: works offline for every Exercise, but it's the History copy 0001 rejected, with the same merge and delete problems.
