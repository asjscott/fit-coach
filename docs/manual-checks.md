# Manual checks on the phone

Checks for Planned Workouts (spec #77). #87 walked the whole flow on the web build at phone size, with a stand-in for Clerk and the local API. These are what that couldn't show: a real sign-in, the real API and database, real native storage, real offline, and how it feels on a phone.

Run from `apps/mobile` with `pnpm ios` / `pnpm android`. If something breaks, `apps/mobile/.expo/dev.log` has the error. Use a physical phone where you can: airplane mode is the point of the offline checks.

For each check, tick the box and fill in the result. Leave **Notes** empty when it passes cleanly; write what you saw when it doesn't, or when something felt off even if it technically passed.

Result codes: **✅ pass** · **❌ fail** · **⚠️ works but feels off** · **⏭ skipped / couldn't test**

## Session

- Date: 06/11/26 9:24am
- Device(s) and OS version: iPhone 14, iOS27
- Build (dev build / Expo Go / web, browser): Expo Go
- Branch and commit: spec/77-planned-workouts

## Before you start

- **Run `pnpm --filter @fit/api seed:exercises` once, from a checkout with `apps/api/.env`.** It stores `ballistic` on the Exercises in the real database. Until then `/exercises` reports the two swings as not Ballistic. Nothing reads it there today: the planner uses the library built into the code.
- **Test accounts** on the Clerk dev instance: a `+clerk_test` email takes the code `424242`.

### Tooling: driving the simulators

- **iOS:** Claude Code's iOS Simulator tool taps, types and takes screenshots, and typing works there. Plain `xcrun simctl` gives screenshots, `openurl` and `ui … appearance` only. Expo Go's gear sits on the header ⋯: drag it out of the way.
- **Android:** `adb` (in `~/Library/Android/sdk/platform-tools`, not on `PATH`) works for taps, typing, screenshots and `uiautomator dump`. The Clerk custom tab's contents aren't in the uiautomator tree, but `adb forward tcp:9222 localabstract:chrome_devtools_remote` exposes the page over the Chrome DevTools Protocol.

---

## Real account, real API

- [x] **P1** A fresh account signs in through Clerk, onboards and reaches Today against the real API, with no 401s.
  - iOS: Result: Pass · Android: Result: · Notes: When reaching today after onboarding the assessment button should be more prominent than start workout, and start workout should be start manual workout
- [x] **P2** After Assessment B, a Planned Workout appears without leaving Today or pulling to refresh.
  - iOS: Result: Pass· Android: Result: · Notes:
- [x] **P3** An account from before M5 isn't sent back through onboarding. Profile shows Standard, and Today gets a plan once it has an Assessment.
  - iOS: Result: Pass· Android: Result: · Notes:
- [x] **P4** Start, log and finish a Workout against the real API. The next plan appears, and History shows the Workout.
  - iOS: Result: Pass· Android: Result: · Notes:
- [x] **P5** Your phone's timezone reaches the server: near midnight on Sunday, the plan's week and This Week agree on the Monday.
  - iOS: Result: Pass· Android: Result: · Notes:

## Onboarding and the card on a phone

- [x] **P6** "Your training time" fits one screen on your smallest phone, with no scrolling and Next visible. It fitted at 375×667 on web, but that isn't a real keyboardless safe area.
  - iOS: Result: Pass· Android: Result: · Notes:
- [x] **P7** The Today card reads well: Exercises, Set counts, targets, estimated time, and the two rows of chips. Do chips wrap sensibly?
  - iOS: Result: Fail· Android: Result: · Notes: This does all fit and it is kind of sensible but the UI looks very cluttered now. Theres too much inofrmation about todays workout before seeing anything else about the week, rest day recommended is very small. Nothing to indicate you have logged a workout today
- [x] **P8** Bodyweight only on a dumbbell or barbell profile: Alternative chips are easy to tell apart from the Length and equipment chips, and tapping one is easy.
  - iOS: Result: Pass· Android: Result: · Notes:
- [skipped] **P9** The estimated time is honest: run a full Standard Workout with a timer. The 5-minute warm-up is a spec assumption "unless it proves wrong on a phone".
  - iOS: Result: · Android: Result: · Notes:
- [x] **P10** Light and dark both read well on the card and the Rest Day recommendation.
  - iOS: Result: Pass · Android: Result: · Notes: REst day recommendation is too small, today is still listed as "planned workout"
- [x] **P19** On a Full gym or Full home gym profile with build_muscle, 4 days and Standard, a week of Planned Workouts includes back squat and barbell bench (6 Sets each in the simulation).
  - iOS: Result: PAss· Android: Result: · Notes:

## Redesigned Today (retests P1, P7 and P10)

The web walk covered each card below in light mode, and the plan card in dark. These check how they feel on a phone.

- [ ] **P21** Before an Assessment, the coloured card leads with Start assessment A, and "Start manual workout" is the smaller option.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P22** On a day to train, the card, the week tiles and the day circles all fit on the first screen, and "Time to train." reads clearly.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P23** "See or change this Workout" opens the sheet: Exercises, targets, Length, equipment and Alternative Exercises. Start stays in reach on a long list, and starting from the sheet opens the Workout.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P24** After finishing a Workout, Today says "Done for today." with its Sets, time and Volume, and "Train again" opens the sheet. No "Connect to plan your next Workout" flashes.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P25** The day after training, with the week's Workouts still fitting, Today says "Rest today." and "Train anyway" opens the sheet. Check it in light and dark.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P26** With a user whose Exercises all stay, Full gym isn't offered. It's still offered when it would change an Exercise.
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

- [ ] **P16** A new week: open the app on Monday. The plan is built for the new week, with nothing carried over. The walk couldn't show this, as it can't move the server's clock, so wait for a real Monday.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P17** Week after week, do the same Exercises carry on, and do Previous Sets stay useful?
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P18** Sign out: the plan and the stored User are gone from the phone, and the next account doesn't see them.
  - iOS: Result: · Android: Result: · Notes:

## Your call

Not bugs, but they need your judgement. Details in `docs/research/planner-simulation.md`.

- Do Workouts that fill their Length, at up to 214% of a Muscle's budget, feel like too much? Should a Workout stop at the budget?
  Hard to tell until I complete some workouts.
- lose_fat gets no back squat or barbell bench, and athletic gets no back squat, at 4 days Standard on a Full gym. Is that right for those Goals? YEs
- Does Full gym feel pointless when nothing changes, as for a user with no equipment? Yes if these are the standard profile then it shouldnt be offered.
- On Bodyweight only, a second row often drops out because `prone-ytw` is the only pull. Does the card's message make that acceptable? Yes
- Does "Connect to plan your next Workout" showing for a moment after Finish, even online, bother you? Yes
- Long reads "About 1:00 h" beside "60 minutes". Worth changing? Yes

---

## Write-up

Answer these after the run, while it's fresh. Short answers are fine.

1. Would you merge as it is? If not, what's the one thing that blocks it? No, the UI is terrible.
2. Which checks failed (IDs)? For each: what you did, what you expected, what happened, and whether it happens every time.
3. Which checks did you skip, and why? Can't test offline, to run on my iPhone I need wifi to connect to the expo-go server, this then means I'm also connect to the dev server.
4. Anything that broke or looked wrong that no check covers?
5. Any wording on screen that was confusing, too long, or didn't match what the app did? Quote it. The rest day wording is good but too small, easy to miss.
6. Did the Exercises, Set counts and targets feel believable for you? Too light, too heavy, or about right? About right
7. Any difference between iOS and Android worth noting? Didn't test android, all android test have to be done via simulator.

### Handing it back to Claude

Paste this file, filled in, with the prompt below:

> Here are my manual test results for spec #77. For each failed or ⚠️ check, and each problem in the write-up: say whether it's a bug, a spec gap, or working as intended, and draft a GitHub issue (title, steps to reproduce, expected, actual) for the ones that need fixing. Show me the drafts before posting anything.
