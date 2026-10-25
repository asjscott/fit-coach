# Workouts: how the pieces connect

Logging, Pending Workouts, sync and History (spec #2). Why the phone holds only unfinished and Pending Workouts:
`docs/adr/0001-history-lives-on-the-server.md`.

## Flow

```text
screens (apps/mobile/src/features/workouts/views)
  └─ LogbookProvider (logbook-provider.tsx): one Logbook per app, its state, and finish → toast
       ├─ Logbook (packages/engines/src/logbook.ts): every rule with no UI; the main test seam
       │    ├─ DeviceStorage: device-storage.ts (phone, SQLite) / device-storage.web.ts (web, localStorage)
       │    ├─ WorkoutUploader: POST /workouts through useApi
       │    └─ PreviousSetsSource: GET /workouts/previous-sets?slug= through useApi (4 s timeout)
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
  `WorkoutExercise` schema is strict, so an upload carrying `previousSets` is refused (400).
- **The finished Workout's `id` is generated on the phone**, which is what makes a retried upload idempotent (201 then
  200).
- **Exercises come from the library built into the app** (`EXERCISES` in `@fit/engines`), not `/exercises`, so the picker
  works offline; an unknown slug is shown as-is (`exerciseName`).
- **New native modules need a new development build** (`expo-sqlite`, `expo-network` so far). Add dependencies with
  `npx expo install` and check the SDK 57 docs first (`apps/mobile/AGENTS.md`).

## Running things

- API without the real database or Clerk: `pnpm --filter @fit/api dev:local` (in-memory MongoDB; `X-Dev-User` header
  picks the user). `apps/api/.env` points at the real database.
- Web storage in real browsers: `pnpm --filter @fit/mobile test:web`.
