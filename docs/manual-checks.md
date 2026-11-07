# Manual checks on the phone

Checks still to run for Planned Workouts (spec #77). The rest passed on an iPhone 14 on 2026-11-06.

Run from `apps/mobile` with `pnpm ios` / `pnpm android`. If something breaks, `apps/mobile/.expo/dev.log` has the error. Use a physical phone where you can: airplane mode is the point of the offline checks.

For each check, tick the box and fill in the result. Leave **Notes** empty when it passes cleanly; write what you saw when it doesn't, or when something felt off even if it technically passed.

Result codes: **✅ pass** · **❌ fail** · **⚠️ works but feels off** · **⏭ skipped / couldn't test**

## Session

- Date:
- Device(s) and OS version:
- Build (dev build / Expo Go / web, browser):
- Branch and commit:

## Before you start

- **Test accounts** on the Clerk dev instance: a `+clerk_test` email takes the code `424242`.

### A release build, for P11 and P14

Expo Go can't reload offline, and the repo has no EAS setup until M8, so build locally on your Mac. From `apps/mobile`:

```bash
npx expo run:ios --configuration Release --device
```

```bash
npx expo run:android --variant release --device
```

- The first run generates `ios/` or `android/`, which are gitignored, and asks for an app identifier, as `app.json` has none. Don't commit either.
- iOS needs a signing team in Xcode. A free Apple ID works, and the app stops opening after 7 days.
- The build bakes in `EXPO_PUBLIC_API_URL`, so point it at an API running this branch's code, not one deployed from `main`, which has no Planned Workouts.

### Tooling: driving the simulators

- **iOS:** Claude Code's iOS Simulator tool taps, types and takes screenshots, and typing works there. Plain `xcrun simctl` gives screenshots, `openurl` and `ui … appearance` only. Expo Go's gear sits on the header ⋯: drag it out of the way.
- **Android:** `adb` (in `~/Library/Android/sdk/platform-tools`, not on `PATH`) works for taps, typing, screenshots and `uiautomator dump`. The Clerk custom tab's contents aren't in the uiautomator tree, but `adb forward tcp:9222 localabstract:chrome_devtools_remote` exposes the page over the Chrome DevTools Protocol.

---

## Timing

- [ ] **P9** The estimated time is honest: run a full Standard Workout with a timer. The 5-minute warm-up is a spec assumption "unless it proves wrong on a phone".
  - iOS: Result: · Android: Result: · Notes:

## Real offline (airplane mode)

Expo Go can't reload offline. Load the app, then turn on airplane mode without closing it: that covers P12, P13, P15 and P20. P11 and P14 need a force-quit, so they need a release build on the phone.

- [ ] **P11** **Clerk on a cold start with no signal.** Have a plan on Today, turn on airplane mode, force-quit, reopen. Today and the card should appear. If the app stays blank, Clerk's `isLoaded` stayed false: `(app)/_layout.tsx` renders nothing until then, and nothing else can pass. The stand-in couldn't show this. A likely fix is `__experimental_resourceCache` from `@clerk/expo/resource-cache`.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P12** Still in airplane mode: change the Length and equipment. The card follows, with your usual Length still selected first.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P13** Start, log and finish. Start isn't held up by the Previous Sets request for long (each has a 4 s timeout). Today says "Connect to plan your next Workout".
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P20** After that finish, Today shows "Done for today." with "Connect to plan your next Workout" on the card.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P14** Force-quit and reopen, still offline: the Pending Workout, the message and native storage all hold.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P15** Turn signal back on, without touching the app, then with the app in the background. The upload and next plan arrive.
  - iOS: Result: · Android: Result: · Notes:

## Over time

These two don't hold up `main`: run them once it's merged and you're training.

- [ ] **P16** A new week: open the app on Monday. The plan is built for the new week, with nothing carried over. The walk couldn't show this, as it can't move the server's clock, so wait for a real Monday.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P17** Week after week, do the same Exercises carry on, and do Previous Sets stay useful?
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P18** Sign out: the plan and the stored User are gone from the phone, and the next account doesn't see them.
  - iOS: Result: · Android: Result: · Notes:

## Your call

Not a bug, but it needs your judgement once you've done some Workouts. Details in `docs/research/planner-simulation.md`.

- Do Workouts that fill their Length, at up to 214% of a Muscle's budget, feel like too much? Should a Workout stop at the budget?

---

## Write-up

Answer these after the run, while it's fresh. Short answers are fine.

1. Would you merge as it is? If not, what's the one thing that blocks it?
2. Which checks failed (IDs)? For each: what you did, what you expected, what happened, and whether it happens every time.
3. Which checks did you skip, and why?
4. Anything that broke or looked wrong that no check covers?
5. Any wording on screen that was confusing, too long, or didn't match what the app did? Quote it.
6. Did the Exercises, Set counts and targets feel believable for you? Too light, too heavy, or about right?
7. Any difference between iOS and Android worth noting?

### Handing it back to Claude

Paste this file, filled in, with the prompt below:

> Here are my manual test results for spec #77. For each failed or ⚠️ check, and each problem in the write-up: say whether it's a bug, a spec gap, or working as intended, and draft a GitHub issue (title, steps to reproduce, expected, actual) for the ones that need fixing. Show me the drafts before posting anything.
