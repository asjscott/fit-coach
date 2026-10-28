# Manual checks on the phone

Gathered from the open `ready-for-human` issues:

- **#27** Test the redesign (#26) on a phone
- **#42** Manual checks: Assessment on a phone and on web

Run from `apps/mobile` with `pnpm ios` / `pnpm android` (or `pnpm web` for the web-width checks). If something breaks, `apps/mobile/.expo/dev.log` has the error.

For each check, tick the box and fill in the result. Leave **Notes** empty when it passes cleanly; write what you saw when it doesn't, or when something felt off even if it technically passed.

Result codes: **✅ pass** · **❌ fail** · **⚠️ works but feels off** · **⏭ skipped / couldn't test**

## Session

- Date: 2026-10-27 (agent run, stopped at sign-in; see Blockers)
- Device(s) and OS version: iPhone 16e simulator, iOS 26.2 · Android emulator, Android 17
- Build (dev build / Expo Go / web, browser): Expo Go on both (no dev build is installed on either simulator)
- Branch and commit: dev @ aee6d6c

## Blockers found in the 2026-10-27 run

An agent tried this checklist on the simulators and couldn't sign in, so **no check below was run**. Fix these first, then rerun the checklist.

### Bug: sign-in can't complete in Expo Go on Android

Steps: open the app in Expo Go on the Android emulator › Create account (or Sign in) › finish the Clerk Account Portal form. A `+clerk_test` email takes the code `424242`.

Expected: the custom tab closes and the app is signed in.

Actual: the custom tab stays on "If you are not redirected automatically, tap Continue". Tapping Continue does nothing. The page's redirect is `mobile:///hosted-auth-callback?created_session_id=…`. Expo Go registers only `exp`, `exps` and its own schemes, not `mobile`, so nothing receives the callback. Sending the URL to Expo Go by hand (`adb shell am start -n host.exp.exponent/.LauncherActivity -d "mobile:///…"`) gives Expo Go's "Something went wrong" screen. It happens every time.

Cause, as far as the run got: `src/app/(auth)/sign-in.tsx` calls `startHostedAuth({ mode })` with no `redirectUrl`. `app.json` sets no `android.package` or `ios.bundleIdentifier`, so `getDefaultRedirectUrl` in `@clerk/expo/dist/hooks/useHostedAuth.js` falls back to `AuthSession.makeRedirectUri({ path: "hosted-auth-callback" })`, which uses `Linking.createURL`. That only gives `mobile:///…` when `Constants.executionEnvironment` isn't `"storeClient"`: in Expo Go it gives an `exp://` link. So the app was probably not detected as running in Expo Go; this is still to be confirmed on the device (#44). The same file notes that on Android the default redirect also needs the Clerk Expo config plugin, which only takes effect in a dev build.

Not checked: whether a dev build (`npx expo run:android`, after adding `android.package`) signs in, and whether iOS Expo Go signs in. iOS's web auth session catches any custom scheme, so iOS may work.

Passing an `exp://` `redirectUrl` from `Linking.createURL` in Expo Go was tried and didn't help: it is what Clerk already does there. The next steps are on #44. The fallback is still to drop Expo Go for this checklist: set `android.package` / `ios.bundleIdentifier`, use a dev build, and say so under "Run from" above.

A test account was created on the Clerk dev instance during the run: `mc-dumbbells+clerk_test@example.com`. Its sign-up finished; only the hand-back to the app failed.

### Tooling: an agent can't drive the simulators on this machine

- **iOS:** no tap or type. Xcode 26 runs the simulator inside DeviceHub (there's no Simulator.app), `osascript` isn't allowed Accessibility access, and installing `idb` was refused. `xcrun simctl` gives screenshots, `openurl` and `ui … appearance` only. Human testing for iOS followed up.
- **Android:** `adb` (in `~/Library/Android/sdk/platform-tools`, not on `PATH`) works for taps, typing, screenshots and `uiautomator dump`. The Clerk custom tab's contents aren't in the uiautomator tree, but `adb forward tcp:9222 localabstract:chrome_devtools_remote` exposes the page over the Chrome DevTools Protocol.

## Suggested order

The Assessment checks need several fresh accounts or Equipment Profiles. A run order that avoids redoing work:

1. **Dumbbells-only account.** Do the redesign checks (Part 1) while working through Assessment A and B (sections 2.1, 2.7).
2. **Full home gym account** for barbell (2.2).
3. **Bodyweight-only account** (2.3).
4. **Light kettlebells only, wrist injury** for load-limited and injured (2.4). One account can do both if the wrist injury is set from the start.
5. **Offline and retake** (2.5, 2.6) on whichever account is handiest. Leave the date change for last and set the date back afterwards.

---

## Part 1: Redesign on a phone (#27)

PR #26 has only been run in the web build. Check each on both iOS and Android.

### 1.1 Finish › Edit times

- [ tick] **R1** iOS: the compact date and time pickers open and work.
  - iOS: Result: Can't check · Notes: The top of the screen is under the clock, bezel and signal/battery indicators, can't pull the screen down to edit times.
- [ x] **R2** Android: the date dialog and the time dialog open and work. The time dialog changes only the time of day, not the date.
  - Android: Result: · Notes:
- [ x] **R3** Edited start and end times are saved (reopen the Workout in History and check).
  - iOS: Result: · Android: Result: · Notes:

### 1.2 In-progress Workout

- [tick] **R4** The in-progress Workout opens full-screen over the tabs.
  - iOS: Result: Pass · Android: Result: · Notes:
- [tick] **R5** Leave workout returns to the tab you came from. (Try starting from more than one tab.)
  - iOS: Result: Pass· Android: Result: · Notes:

### 1.3 Tab bar

- [tick] **R6** The bottom safe-area inset looks right (nothing under the home indicator / gesture bar, no big empty gap).
  - iOS: Result: Pass · Android: Result: · Notes:
- [tick] **R7** Tab labels aren't clipped.
  - iOS: Result: Pass· Android: Result: · Notes:

### 1.4 Resume pill

- [tick] **R8** With a Workout in progress, the Resume pill shows above the tab bar on History, Exercises and Profile.
  - iOS: Result: Pass· Android: Result: · Notes:
- [tick] **R9** The Resume pill does **not** show on Today.
  - iOS: Result: Pass· Android: Result: · Notes:
- [tick] **R10** Tapping the pill reopens the Workout.
  - iOS: Result: Pass· Android: Result: · Notes:

### 1.5 Logging

- [tick] **R11** The steppers work (tap and, if supported, hold).
  - iOS: Result: Fail· Android: Result: · Notes: Only increase stepper works, not decrease
- [tick] **R12** The keyboard's Done bar shows and dismisses the keyboard.
  - iOS: Result: Fail· Android: Result: · Notes: Keyboard inputs do not work on ios simulator, they work on expo go on my physical phone.Looks stylistically off
- [tick] **R13** Touch targets feel at least 44pt. Note any that are fiddly to hit.
  - iOS: Result: Pass · Android: Result: · Notes: Edit, and clicking the check feel off. Delete in a pull up sheet feels weird, should be a trash icon? Same for edit, a pen?

### 1.6 Light and dark

- [tick] **R14** The app follows the phone's light/dark setting, including when it's switched while the app is open.
  - iOS: Result: Pass· Android: Result: · Notes:

### 1.7 Expo Go

- [cross] **R15** Does Expo Go include `@expo/ui` (which the pickers need)? Open Finish › Edit times in Expo Go and note what happens.
  - Answer: · Notes: Can't check edit times as the edit button is under the top of the screen height

---

## Part 2: Assessment (#42)

Gathered from the on-phone acceptance criteria of #35–#39 and the review fixes in ba25557.

### 2.1 Weighted Assessment, dumbbells only (#35, #36)

- [tick] **A1** Today offers **Assessment A**. Starting it adds goblet squat, dumbbell Romanian deadlift and plank, in that order.
  - Result: partial· Notes: It opens and you can complete the exercises, but the first open exercise is deadlift, you can see goblet squat above incomplete.
- [ticj] **A2** You can't add, remove or reorder its Exercises.
  - Result: Pass· Notes:
- [tick] **A3** The first suggested load is one of your dumbbells, and it feels light.
  - Result: Fail· Notes: Starts with the heaviest load
- [tick] **A4** Each Set needs an RPE chip (6–10).
  - Result: Pass· Notes: Log set should be disabled until RPE is selected
- [tick] **A5** After each Set, the hint reads like "Next: 14 kg × 5, then rate it" and moves through your actual dumbbells.
  - Result: Fail· Notes: No hints given
- [tick] **A6** A Set rated RPE 9 or higher marks the test done.
  - Result: Pass· Notes: Should move you on to the next exercise when done, or at least not have anymore log sets options but have a nexr exercise button
- [ticj] **A7** The plank is one Set, logged in seconds.
  - Result: Pass · Notes:
- [tick] **A8** After finishing A, Today offers **Assessment B** (push, then pull).
  - Result: Pass· Notes: Starts with dumbell row open, not push ups
- [tick] **A9** After finishing B, both the finish toast and Today lead to the Results screen.
  - Result: Pass· Notes: Results screen has first exercise obscured at the top of the screen. Back button has (tabs) in writing in it.
- [ticj] **A10** Results lists each test with its Exercise, its top Set and an estimated maximum like "16.8 kg".
  - Result: Pass· Notes:
- [tick] **A11** The plank shows its seconds as "Held".
  - Result: Pass· Notes:
- [tick] **A12** Results shows starting Working Levels, grouped by Pattern, for every Exercise available in the primary Equipment Profile.
  - Result: Pass· Notes:
- [tick] **A13** Each Working Level is rounded to a dumbbell you have.
  - Result: Pass· Notes:

### 2.2 Barbell (#36)

- [tick] **B1** With a full home gym, the tests are back squat, deadlift, barbell bench press and pull-up.
  - Result: Pass· Notes: HArd to scroll between exercises on the screen. Finish should be disabled until all tests completed. Then finish should be primary button
- [tick] **B2** Load suggestions step through real plate pairs.
  - Result: Pass· Notes: Suggested next level starts with real plates, stepper always by 2kg not
- [tick] **B3** Results rounds Working Levels to loads the plates can make.
  - Result: Pass· Notes:

### 2.3 Bodyweight only (#37)

- [tick] **W1** With an Equipment Profile that has no equipment, A and B both finish.
  - Result: Pass · Notes: Need a long hold to get to higher reps quicker
- [tick] **W2** Bodyweight tests ask for one Set of as many reps as you can, with no RPE.
  - Result: Pass· Notes: Shouldnt be able to log a second set when max is reached
- [tick] **W3** Results shows the reps done as "Rep maximum", plus Working Levels.
  - Result: Pass· Notes:

### 2.4 Load-limited, untested and injured (#38)

- [tick] **L1** With only light kettlebells, keep going past 12 reps at the heaviest without reaching RPE 9. The test ends.
  - Result: Pass · Notes:
- [tick] **L2** Results then shows "at least X kg · Limited by your equipment".
  - Result: Pass· Notes:
- [tick] **L3** With a wrist injury, Today's Assessment B offer says "No test suits your injuries and equipment for push, so it's estimated from your other results."
  - Result: Faile· Notes: Offers floor press
- [tick] **L4** B then starts with pull only.
  - Result: Fail· Notes:
- [tick] **L5** Results labels push "Not tested" and "Estimated from your other results", and its Working Levels say so too.
  - Result: Fail· Notes:
- [tick] **L6** Finish a weighted test without reaching RPE 9. Results treats that Pattern as untested and estimated.
  - Result: Pass· Notes:

### 2.5 Offline (#39)

- [ ] **O1** Finish A offline (airplane mode). Today offers B straight away.
  - Result: · Notes:
- [ ] **O2** Finish B offline. Today and Results both say "Results once synced".
  - Result: · Notes:
- [ ] **O3** Get signal back. The Workouts upload and the Results appear.
  - Result: · Notes:

### 2.6 Out of order and retaken (#39)

- [ ] **T1** With an A more than 14 days old and no B after it, Today also offers "Redo assessment A". (Fake the 14 days by changing the phone's date.)
  - Result: · Notes:
- [ ] **T2** Dismiss the offer. It stays hidden until the offer changes, for example when A goes stale.
  - Result: · Notes:
- [ ] **T3** Retake from Profile. Doing A and B again replaces the Working Levels on Results.
  - Result: · Notes:
- [ ] **T4** With a Workout in progress, Profile says to finish it first instead of showing Retake.
  - Result: · Notes:

### 2.7 Everywhere

- [tick] **E1** Assessment Workouts show in History.
  - Result: Pass· Notes:
- [tick] **E2** They count toward this week's Volume.
  - Result: Pass· Notes:
- [tick] **E3** Their Sets show as Previous Sets in later Workouts.
  - Result: Pass· Notes:
- [cross] **E4** Results, Today and the logging screen read well in light and dark mode.
  - Result: Can't change between light and dark as its hidden at the top of the page under navigation · Notes:
- [tick] **E5** Results, Today and the logging screen read well at phone width on web (`pnpm web`, narrow the window or use device mode).
  - Result: Pass· Notes:

**Not checkable by hand:** the "Assessment unavailable" message on Today and Profile. No injury combination in today's library leaves A or B with no test at all, so it's covered only by the `canAssess` and `assessmentOffer` unit tests.

---

## Write-up

Answer these after the run, while it's fresh. Short answers are fine.

### Overall

1. Would you merge / ship as it is? If not, what's the one thing that blocks it?
   No, the tabbed pages are all too high on the screen so some of the view is hidden.
2. Which checks failed (IDs)? For each: what you did, what you expected, what happened, and whether it happens every time.
   See notes above for failed tests. One big fail was after every new user created the keyboard input didn't work after the clerk sign in screen, closing expo go and reopening kept the user signed in and the keyboard inouts worked
3. Which checks did you skip, and why (no device, couldn't set up the state, ran out of time)?
   Skipped all android tests as login doesn't work. Didn't bother with offline testing or anything that depends on time.

### Beyond the checklist

4. Anything that broke or looked wrong that no check covers?
   Screen scrolling between exercises when doing a workout doesn't work very well. The decrease buttons on inputs don't work.
5. Any wording on screen that was confusing, too long, or didn't match what the app did? Quote it.
   The passing a test or suggested next set text was small, not very noticable or clear for progress.
6. Where did you hesitate or have to think about what to tap next?
   After completing one set what to do next wasn't clear. Definitely not clear to choose an RPE as log set in enabled. Not clear to move on when test is complete.
7. Did the suggested loads and the Working Levels feel believable for you? Too light, too heavy, or about right?
   Didn't actually do the tests so hard to tell
8. Any difference between iOS, Android and web worth noting?
9. Anything slow, janky, or that flickered (navigation, sync, Results appearing)?
   Janky navigation, back button covers the part of the screen, screen titles feel weird. Scrolling isn't smooth.

### Handing it back to Claude

Paste this file, filled in, with the prompt below:

> Here are my manual test results for #27 and #42. For each failed or ⚠️ check, and each problem in the write-up: say whether it's a bug, a spec gap, or working as intended, and draft a GitHub issue (title, steps to reproduce, expected, actual) for the ones that need fixing. Then draft a comment for #27 and one for #42 summarising what passed, what failed with links to the new issues, and what was skipped. Show me the drafts before posting anything.
