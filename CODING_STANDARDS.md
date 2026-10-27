# Coding standards

Judgement calls for review. Formatting (Prettier, 120 columns), lint (including `fit/no-leaked-jsx-text`), types and
tests are enforced by CI, so they are not repeated here.

## Domain language

- Name code, tests and UI copy with the terms in `GLOSSARY.md`, and none of the terms it lists under _Avoid_.
- In UI sentences, capitalise glossary terms: "Add an Exercise to start logging Sets.", "This Workout isn't in your
  History.". Button labels stay in sentence case: "Start workout", "Log set".
- Where the spec or ticket and `GLOSSARY.md` define a term differently, raise it as a finding naming both, rather than
  judging the code against either one.

## Reuse before writing

Reach for the shared piece first; a second copy of any of these is a finding:

- `apps/mobile/src/utils/error-message.ts`: turning a caught error into display text.
- `apps/mobile/src/components/choice-modal`: confirmation and choice dialogs (`ConfirmModal`, `ChoiceModal`).
- `apps/mobile/src/features/workouts/format.ts`: Workout dates, times, durations and Set descriptions.
- `apps/mobile/src/features/workouts/library.ts`: an Exercise by slug, and `exerciseName` with its slug fallback.
- `apps/mobile/src/features/workouts/components/set-row.tsx`: a logged Set in a list.

## Where logic and tests live

- Rules without UI belong in `@fit/engines` (the Logbook, pure functions such as `pickerRows`) or as schemas in
  `@fit/shared`; screens and routes stay thin and call them.
- Tests drive those seams through their public interface and assert what a user would observe; expected values come from
  the spec or a worked example, never recomputed the way the code does. Screens and API routes are not unit-tested;
  exercise routes with `pnpm --filter @fit/api dev:local` and web storage with `pnpm --filter @fit/mobile test:web`.

## Comments

One or two lines saying why, at the density of the surrounding file. A comment that restates the code is a finding.
