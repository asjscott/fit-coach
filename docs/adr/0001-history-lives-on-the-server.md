# The phone holds only unfinished and Pending Workouts; History lives on the server

Users log Workouts where there is often no signal, so the in-progress Workout is saved on the device the moment anything changes (through `expo-sqlite/kv-store` on the phone, `localStorage` on web), and a finished Workout stays on the phone as a Pending Workout until it reaches the server. History is never stored on the phone: it is fetched from the server when online and is unavailable offline, apart from any Pending Workouts.

Keeping History server-only means there is no copy on the phone to keep in step with the server: no merge rule, no markers for deleted Workouts, and deletes are plain requests. Pending Workouts upload with an id the phone generated, so a retried upload never creates a duplicate.

## Considered Options

- **History stored on the phone and merged with the server**: History would work offline, but it needs a merge rule and markers for deletes so a stale copy can't bring back a deleted Workout.
- **AsyncStorage holding JSON**: can corrupt if the app is killed mid-write; `kv-store` has the same simple API but writes through SQLite.
- **`kv-store` on web too**: its web build keeps SQLite in a worker over browser file handles that only one tab can hold, and it fails in Safari. On web, `localStorage` works in every browser and tab; each write is atomic, and the data is a few kilobytes. The cost is that a browser can clear it, so offline Workouts are less durable on web than on the phone.
- **WatermelonDB or PowerSync**: built-in sync for a problem we no longer have, and PowerSync needs its own service beside MongoDB.

## Consequences

Viewing History offline, or editing a finished Workout, would each bring back the need for real sync and should reopen this decision.
