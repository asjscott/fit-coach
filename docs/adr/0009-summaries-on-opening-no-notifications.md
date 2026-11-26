---
status: accepted
---

# M8 shows summaries when the app is opened, with no notifications

Supersedes [0006](0006-scheduled-jobs-through-github-actions.md). M8 was to reach out by web push: an evening summary and a Sunday review, sent by a GitHub Actions cron that woke the API hourly. Instead, nothing is sent. Today shows a Day Summary from 6 to 10 pm, and a Week Summary the first time the app is opened after 6 pm on Sunday. Both are worked out from the day or week when they're shown, from templates, with no LLM.

## Why

- **Push doesn't fit how the app is used.** The daily app is the native Release build, which on a free Apple account can't receive remote push, and web push reaches an iPhone only through the installed PWA. `dev` runs on the Mac over plain HTTP, with no HTTPS origin and no cron, so push could only be tested on production, which takes only finished milestones.
- **The user opens the app every day anyway**, to log food and train, so a summary waiting on Today is seen without being sent.
- **No scheduler, no Actions minutes.** Nothing has to run at a time of day, so there's no `/jobs/run`, no secret, no job-run records and no dedupe.

## Consequences

- The roadmap's M8 goal changes from "the app reaches out" to "the app sums up the day and the week when it's opened".
- Nothing is stored for the summaries apart from the Week Summary having been seen. The roadmap's "daily totals stored for the weekly review" is dropped.
- If push ever comes back (the PWA as the daily app, or a paid Apple account), 0006's cron and idempotent jobs are where to start.
- M10's open question on Strava can't lean on "the M8 cron".
