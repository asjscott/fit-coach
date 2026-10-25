---
name: run-mobile
description: Run, drive and screenshot the Fit Coach mobile app (Expo) through its web build. Use when asked to run, start, launch, screenshot or click through the mobile app, check a UI change in the real app, capture screens for a design review, or walk a Workout (start, add Exercise, log Sets, finish).
---

# Run the mobile app

The agent path is the web build at iPhone 13 size, driven by [driver.mjs](driver.mjs) with the app's own Playwright devDependency. Paths below are relative to `apps/mobile`. The driver lands screenshots and the saved session in `.expo/run-mobile/` (gitignored).

## Prerequisites

- **Expo dev server on port 8081.** If something already listens there, it's the user's `pnpm web`/`pnpm start`: reuse it. Check with `lsof -iTCP:8081 -sTCP:LISTEN`. Otherwise start one in the background (`CI=1` keeps Expo from prompting; plain `pnpm start` would overwrite `.expo/dev.log`) and wait until it responds:

  ```bash
  CI=1 pnpm exec expo start --port 8081
  until curl -sf -o /dev/null http://localhost:8081; do sleep 1; done
  ```

- **The API** (`apps/api`, `pnpm dev`) at the `EXPO_PUBLIC_API_URL` in `.env`. Without it, signed-in screens show "Couldn't load your account".
- **Playwright's Chromium.** It was already in `~/Library/Caches/ms-playwright` when this skill was written. A missing browser should be fixed by `pnpm exec playwright install chromium`, but that command hasn't been tested here.

## Run (agent path)

```bash
node .claude/skills/run-mobile/driver.mjs tour            # every screen, light then dark
node .claude/skills/run-mobile/driver.mjs tour dark       # one scheme
node .claude/skills/run-mobile/driver.mjs shot /history --dark
node .claude/skills/run-mobile/driver.mjs shot /exercises --tall
```

- `tour` captures: home, exercises, history, onboarding and styleguide (each at fold height and `-full`), then exercise detail and history detail. Then it starts a Workout, opens the picker, logs 2 Goblet squat Sets and a 45 s Plank, and stops on Finish **without saving**.
- `shot <route>` captures one route. `--tall` renders the whole scroll height; `--wide` uses a 1280×860 desktop window. Query values join the filename: `shot "/history?variant=a"` lands as `history-a-<scheme>.png`.
- Each screenshot path is printed with the pathname it actually landed on. A `/sign-in` or `/` where you expected something else means a redirect.
- A failing tour step prints `FAILED at <url>`, saves `_failure-<scheme>.png` and exits 1.
- **Look at the PNGs** with Read. A 200 from the dev server doesn't mean the screen rendered.

### Signing in (needs the human)

Every screen except `/sign-in` needs a Clerk session, and on the web sign-in goes through Clerk's hosted Account Portal. An agent can't complete that, so run this in the background and ask the user to sign in in the window that opens:

```bash
node .claude/skills/run-mobile/driver.mjs auth
```

It waits up to 10 minutes for the redirect back to the app, then saves `.expo/run-mobile/auth-state.json`. Later runs reuse that file without asking again. When signed-in screens start redirecting to `/sign-in`, the session has expired: run `auth` again.

## Run (human path)

`pnpm web` opens the app in your browser, and `pnpm ios` / `pnpm android` open it on a device or simulator. Both also write to `.expo/dev.log`.

## Gotchas

- **The web app must be served from `http://localhost:8081`.** The API's CORS allowlist defaults to that one origin (`CORS_ORIGINS` in `apps/api/.env`). On another port, Clerk still signs you in, but every API call fails and the app shows "Couldn't load your account / Failed to fetch". `BASE_URL` overrides the driver's target only if you've also added that origin to `CORS_ORIGINS`.
- **`fullPage: true` screenshots stop at the fold.** React Native Web scrolls an inner view, not the document, so the driver uses a 2400px-tall viewport instead. In those `-full` shots, buttons pinned to the bottom sit far below the content with a big gap; a real phone doesn't do that.
- **Rows aren't links.** Exercise and History rows are `Pressable`s that call `router.push`, so there's no `<a href>` to follow. Click the row's text, as `tour` does: the Exercise name, or the History row's `N min` duration.
- **`LoadingButton` is a link when it has `href`** (Add exercise, Finish, History…) and a button otherwise (Log set, Start workout). `button()` in the driver matches either role.
- **The Logbook lives in the browser context's storage**, and each run uses a fresh context, so a Workout started by the driver never touches the user's real browser. It doesn't reach the API either until Save workout, which `tour` never presses.
- **Expo Router warns** that `src/app/(app)/profile.tsx` and `src/app/(auth)/sign-up.tsx` have no default export; both files are empty. Opening `/sign-up` directly throws "Element type is invalid", which the driver prints as a `pageerror`. Nothing in the app links there; sign-up goes through Clerk.

## Troubleshooting

- `No dev server at http://localhost:8081` (driver exits 1): start one as described under Prerequisites.
- The screenshot shows "Couldn't load your account / Failed to fetch": the API isn't running, or the page isn't on `localhost:8081` (see the CORS gotcha).
- Signed-in routes print `(/sign-in)`: there's no session, or it has expired. Run `auth`.
