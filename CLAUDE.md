## Agent skills

### Issue tracker

Issues live in GitHub Issues for asjscott/fit-coach, via the gh CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Code

### Workouts

Logging, device storage, sync, History and the workouts API: see `docs/agents/workouts.md`.

### Dev server output

`pnpm start` / `web` / `ios` / `android` in `apps/mobile` also write the dev server's output to `apps/mobile/.expo/dev.log`: read it for the current bundling or runtime error.
