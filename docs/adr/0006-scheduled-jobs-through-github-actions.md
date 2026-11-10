# Scheduled jobs through GitHub Actions

The evening summary and the Sunday review need something to run at a time of day. The Build plan used Agenda inside the API, but on Render's free instance the API sleeps after 15 minutes, and a sleeping process runs no timers. So a scheduled GitHub Actions workflow calls `POST /jobs/run` with a shared secret every hour. The call wakes the API, which works out which jobs are due in the user's timezone, runs them and records each run, so a late, missed or repeated call never sends twice or skips a day.

## Consequences

- Jobs run to within about an hour, as GitHub's cron can start late and runs hourly. So the evening summary is due at 6 pm, to arrive by 7.
- The repository is private, so each run spends Actions minutes from the 2,000 free a month. An hourly run for production and staging uses about 1,450. If CI needs more, the workflow runs only in the evening hours.
- Every job is idempotent and keyed by user, job and local date, and `/jobs/run` rejects calls without the secret.
- Agenda is dropped, and so is any in-process timer.

## Considered Options

- **Agenda in the API**: what the PDF planned, but it never fires while the free instance sleeps.
- **cron-job.org or a ping service**: works the same way, but adds another account, and keeps nothing in the repository.
- **Work it out when the app opens**: costs nothing, but it can't push a notification to someone who hasn't opened the app.
- **Local notifications on the phone**: no server needed, but they need the native app, which [0005](0005-free-tier-and-the-pwa-first.md) set aside, and can't include the day's totals.
