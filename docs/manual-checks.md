# Manual checks on the phone

The rerun asked for in **#59**, for the open `ready-for-human` issues:

- **#27** Test the redesign (#26) on a phone
- **#42** Manual checks: Assessment on a phone and on web

The 2026-10-27 run was iOS only. Its results are in the comments on #27 and #42. Checks that passed there with no follow-up are kept here only for Android. Everything that failed, was skipped, or was changed by a fix since is checked again on both.

Run from `apps/mobile` with `pnpm ios` / `pnpm android` (or `pnpm web` for the web-width checks). If something breaks, `apps/mobile/.expo/dev.log` has the error.

For each check, tick the box and fill in the result. Leave **Notes** empty when it passes cleanly; write what you saw when it doesn't, or when something felt off even if it technically passed.

Result codes: **✅ pass** · **❌ fail** · **⚠️ works but feels off** · **⏭ skipped / couldn't test**

## Session

- Date:
- Device(s) and OS version:
- Build (dev build / Expo Go / web, browser):
- Branch and commit:

## Before you start

- **Android sign-in works in Expo Go now** (#44). Test accounts on the Clerk dev instance: `mc-dumbbells+clerk_test@example.com` and `mc-44-android+clerk_test@example.com`. A `+clerk_test` email takes the code `424242`.
- **Typing on the iOS simulator** didn't work at all last time but worked on a physical phone. Do the typing checks (R12, K1) on a physical iPhone if the simulator still won't type.
- **Info still missing** (#59), collect it while you go:
  - a screen recording of scrolling between Exercises (#54), if it still feels janky;
  - screenshots of the screen titles that "feel weird", and which screens (#56).

### Tooling: an agent can't drive the simulators on this machine

- **iOS:** no tap or type. Xcode 26 runs the simulator inside DeviceHub (there's no Simulator.app), `osascript` isn't allowed Accessibility access, and installing `idb` was refused. `xcrun simctl` gives screenshots, `openurl` and `ui … appearance` only.
- **Android:** `adb` (in `~/Library/Android/sdk/platform-tools`, not on `PATH`) works for taps, typing, screenshots and `uiautomator dump`. The Clerk custom tab's contents aren't in the uiautomator tree, but `adb forward tcp:9222 localabstract:chrome_devtools_remote` exposes the page over the Chrome DevTools Protocol.

## Suggested order

The Assessment checks need several fresh accounts or Equipment Profiles. A run order that avoids redoing work:

1. **Dumbbells-only account**, created fresh (for K1 and S1). Do Part 1 and Part 3 while working through Assessment A and B (sections 2.1, 2.7).
2. **Full home gym account** for barbell (2.2).
3. **Bodyweight-only account** (2.3).
4. **Light kettlebells only, wrist injury** for load-limited and injured (2.4). One account can do both if the wrist injury is set from the start.
5. **Offline and retake** (2.5, 2.6) on whichever account is handiest. Leave the date change for last and set the date back afterwards.

---

## Part 0: Sign-in and headers

### 0.1 Sign-in in Expo Go (#44, #48)

- [ ] **S1** Android: Create account and Sign in both return to the app signed in. Then Sign out and Create account again in the same session.
  - Android: Result: · Notes:
- [ ] **S2** Android: closing the Clerk tab with ✕ returns to Sign in, and Sign in opens a new tab.
  - Android: Result: · Notes:
- [ ] **K1** Straight after creating a new account, typing works in onboarding and in a stepper without restarting Expo Go (#48).
  - iOS: Result: · Android: Result: · Notes:

### 0.2 Headed screens (#45)

- [ ] **H1** On Profile, a Workout, Finish and Assessment results, the content starts below the header and status bar, and the first row can be reached.
  - iOS: Result: · Android: Result: · Notes:

---

## Part 1: Redesign on a phone (#27)

### 1.1 Finish › Edit times

Blocked last time by #45.

- [ ] **R1** iOS: the compact date and time pickers open and work.
  - iOS: Result: · Notes:
- [ ] **R2** Android: the date dialog and the time dialog open and work. The time dialog changes only the time of day, not the date.
  - Android: Result: · Notes:
- [ ] **R3** Edited start and end times are saved (reopen the Workout in History and check).
  - iOS: Result: · Android: Result: · Notes:

### 1.2 In-progress Workout

- [ ] **R4** The in-progress Workout opens full-screen over the tabs.
  - Android: Result: · Notes:
- [ ] **R5** Leave workout returns to the tab you came from. (Try starting from more than one tab.)
  - Android: Result: · Notes:

### 1.3 Tab bar

- [ ] **R6** The bottom safe-area inset looks right (nothing under the gesture bar, no big empty gap).
  - Android: Result: · Notes:
- [ ] **R7** Tab labels aren't clipped.
  - Android: Result: · Notes:

### 1.4 Resume pill

- [ ] **R8** With a Workout in progress, the Resume pill shows above the tab bar on History, Exercises and Profile.
  - Android: Result: · Notes:
- [ ] **R9** The Resume pill does **not** show on Today.
  - Android: Result: · Notes:
- [ ] **R10** Tapping the pill reopens the Workout.
  - Android: Result: · Notes:

### 1.5 Steppers (#47, #57, #58)

- [ ] **R11** − and + both step kg, reps and seconds. − never goes below zero.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **R16** A tap steps once. Holding − or + keeps stepping, speeds up the longer it's held, and stops on release.
  - iOS: Result: · Android: Result: · Web: Result: · Notes:
- [ ] **R17** With dumbbells, kg steps through your actual dumbbells, in both a Manual Workout and an Assessment test. With a barbell (2.2), it steps through bar plus plate pairs.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **R18** Type a kg value between two of your loads. − and + go to the nearest real load below or above it. At the heaviest load, + stays put.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **R19** An Exercise your primary Equipment Profile has no loads for (for example a machine you don't own) steps kg by 2.
  - iOS: Result: · Android: Result: · Notes:

### 1.6 Keyboard Done (#56)

- [ ] **R12** On the number pad, Done shows as a round tick floating above the keyboard (Liquid Glass on iOS 26) and dismisses the keyboard. Take a screenshot.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **R20** Onboarding's Cancel and Sign out are muted body text, not pressed against the progress bar.
  - iOS: Result: · Android: Result: · Notes:

### 1.7 Set actions and the sheet (#56)

- [ ] **R13** A logged Set's ⋯ shows a pen, a trash can and a tick in the row. Only one row has them open at a time. The tick closes them, and closes the editor if that Set was being edited. Touch targets feel at least 44pt.
  - iOS: Result: · Android: Result: · Web: Result: · Notes:
- [ ] **R21** The pen opens the editor below and stays highlighted while editing. The editor has only Cancel.
  - iOS: Result: · Android: Result: · Web: Result: · Notes:
- [ ] **R22** Deleting a Set asks first, including while that Set is being edited.
  - iOS: Result: · Android: Result: · Web: Result: · Notes:
- [ ] **R23** Delete exercise asks first, with and without Sets, from both the current box and a collapsed row.
  - iOS: Result: · Android: Result: · Web: Result: · Notes:
- [ ] **R24** iOS: the confirmations opened from a ⋯ sheet appear: Delete exercise, Discard workout, and Delete workout on a History Workout.
  - iOS: Result: · Notes:
- [ ] **R25** Dragging the sheet's handle down closes it, and a short drag springs back. On web, try both mouse and touch.
  - iOS: Result: · Android: Result: · Web: Result: · Notes:
- [ ] **R26** The longer picker sheets (onboarding and Profile selects) still scroll back up, rather than closing.
  - iOS: Result: · Android: Result: · Web: Result: · Notes:
- [ ] **R27** Assessment Workouts have no Exercise ⋯, and History's Set rows look the same as before.
  - iOS: Result: · Android: Result: · Web: Result: · Notes:

### 1.8 Scrolling (#54, #63)

- [ ] **R28** With the current box filling the screen, a drag that starts anywhere in it (title, banner, labels, gaps) scrolls the Workout, so the RPE chips and Log set can be reached.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **R29** Scrolling between Exercises and tapping rows to switch feels smooth, and the newly current Exercise is in view. If not, record the screen.
  - iOS: Result: · Android: Result: · Notes:

### 1.9 Light and dark

- [ ] **R14** The app follows the phone's light/dark setting, including when it's switched while the app is open.
  - Android: Result: · Notes:

### 1.10 Expo Go

- [ ] **R15** Does Expo Go include `@expo/ui` (which the pickers need)? Open Finish › Edit times in Expo Go and note what happens.
  - iOS: Answer: · Android: Answer: · Notes:

---

## Part 2: Assessment (#42)

### 2.1 Weighted Assessment, dumbbells only (#35, #36)

- [ ] **A1** Today offers **Assessment A**. Starting it adds goblet squat, dumbbell Romanian deadlift and plank, in that order, and opens on goblet squat (#49).
  - iOS: Result: · Android: Result: · Notes:
- [ ] **A2** You can't add, remove or reorder its Exercises.
  - Android: Result: · Notes:
- [ ] **A3** The first suggested load is one of your dumbbells, the heaviest at or below half your likely maximum.
  - Android: Result: · Notes:
- [ ] **A4** Each Set needs an RPE chip (6–10), and Log set stays disabled until one is picked (#51).
  - iOS: Result: · Android: Result: · Notes:
- [ ] **A5** The guidance shows as a banner in the current box, like "Next: 14 kg × 5, then rate it", and moves through your actual dumbbells. It's easy to see between Sets (#53).
  - iOS: Result: · Android: Result: · Notes:
- [ ] **A6** A Set rated RPE 9 or higher marks the test done. The banner turns to Done, Log set is replaced by **Next test**, and no more Sets can be logged. The done test stays open until you tap Next test (#52).
  - iOS: Result: · Android: Result: · Notes:
- [ ] **A7** The plank is one Set, logged in seconds.
  - Android: Result: · Notes:
- [ ] **A14** After the last test, the banner says to finish the Workout (not "On to the next test") and Finish becomes the main button. Finish is still there, as a secondary button, before every test is done.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **A8** After finishing A, Today offers **Assessment B**, which opens on push, then pull (#49).
  - iOS: Result: · Android: Result: · Notes:
- [ ] **A9** After finishing B, both the finish toast and Today lead to the Results screen. Its first test isn't under the header (#45), and the back button is a bare chevron, not "(tabs)" (#46).
  - iOS: Result: · Android: Result: · Notes:
- [ ] **A10** Results lists each test with its Exercise, its top Set and an estimated maximum like "16.8 kg".
  - Android: Result: · Notes:
- [ ] **A11** The plank shows its seconds as "Held".
  - Android: Result: · Notes:
- [ ] **A12** Results shows starting Working Levels, grouped by Pattern, for every Exercise available in the primary Equipment Profile.
  - Android: Result: · Notes:
- [ ] **A13** Each Working Level is rounded to a dumbbell you have.
  - Android: Result: · Notes:

### 2.2 Barbell (#36)

- [ ] **B1** With a full home gym, the tests are back squat, deadlift, barbell bench press and pull-up. Moving between the four is easy (#63).
  - iOS: Result: · Android: Result: · Notes:
- [ ] **B2** Load suggestions and the kg stepper both step through real plate pairs (#58).
  - iOS: Result: · Android: Result: · Notes:
- [ ] **B3** Results rounds Working Levels to loads the plates can make.
  - Android: Result: · Notes:

### 2.3 Bodyweight only (#37)

- [ ] **W1** With an Equipment Profile that has no equipment, A and B both finish. Holding + gets to high reps quickly (#57).
  - iOS: Result: · Android: Result: · Notes:
- [ ] **W2** Bodyweight tests ask for one Set of as many reps as you can, with no RPE. After that Set, Log set is replaced by Next test, and a second Set can't be logged (#52).
  - iOS: Result: · Android: Result: · Notes:
- [ ] **W3** Results shows the reps done as "Rep maximum", plus Working Levels.
  - Android: Result: · Notes:

### 2.4 Load-limited, untested and injured (#38)

L3–L5 failed last time because the floor press wasn't flagged for wrist injuries. It is now (494a6ac): rerun with the same setup.

- [ ] **L1** With only light kettlebells, keep going past 12 reps at the heaviest without reaching RPE 9. The test ends, and Next test appears.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **L2** Results then shows "at least X kg · Limited by your equipment".
  - Android: Result: · Notes:
- [ ] **L3** With a wrist injury, Today's Assessment B offer says "No test suits your injuries and equipment for push, so it's estimated from your other results."
  - iOS: Result: · Android: Result: · Notes:
- [ ] **L4** B then starts with pull only.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **L5** Results labels push "Not tested" and "Estimated from your other results", and its Working Levels say so too.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **L6** Finish a weighted test without reaching RPE 9. Results treats that Pattern as untested and estimated.
  - Android: Result: · Notes:

### 2.5 Offline (#39)

Not run last time.

- [ ] **O1** Finish A offline (airplane mode). Today offers B straight away.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **O2** Finish B offline. Today and Results both say "Results once synced".
  - iOS: Result: · Android: Result: · Notes:
- [ ] **O3** Get signal back. The Workouts upload and the Results appear.
  - iOS: Result: · Android: Result: · Notes:

### 2.6 Out of order and retaken (#39)

Not run last time.

- [ ] **T1** With an A more than 14 days old and no B after it, Today also offers "Redo assessment A". (Fake the 14 days by changing the phone's date.)
  - iOS: Result: · Android: Result: · Notes:
- [ ] **T2** Dismiss the offer. It stays hidden until the offer changes, for example when A goes stale.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **T3** Retake from Profile. Doing A and B again replaces the Working Levels on Results.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **T4** With a Workout in progress, Profile says to finish it first instead of showing Retake.
  - iOS: Result: · Android: Result: · Notes:

### 2.7 Everywhere

- [ ] **E1** Assessment Workouts show in History.
  - Android: Result: · Notes:
- [ ] **E2** They count toward this week's Volume.
  - Android: Result: · Notes:
- [ ] **E3** Their Sets show as Previous Sets in later Workouts.
  - Android: Result: · Notes:
- [ ] **E4** Results, Today and the logging screen read well in light and dark mode, including the banner's info and success colours. (Blocked last time by #45.)
  - iOS: Result: · Android: Result: · Notes:

**Not checkable by hand:** the "Assessment unavailable" message on Today and Profile. No injury combination in today's library leaves A or B with no test at all, so it's covered only by the `canAssess` and `assessmentOffer` unit tests.

---

## Write-up

Answer these after the run, while it's fresh. Short answers are fine.

### Overall

1. Would you merge / ship as it is? If not, what's the one thing that blocks it?
2. Which checks failed (IDs)? For each: what you did, what you expected, what happened, and whether it happens every time.
3. Which checks did you skip, and why (no device, couldn't set up the state, ran out of time)?

### Beyond the checklist

4. Anything that broke or looked wrong that no check covers?
5. Any wording on screen that was confusing, too long, or didn't match what the app did? Quote it.
6. Where did you hesitate or have to think about what to tap next?
7. Did the suggested loads and the Working Levels feel believable for you? Too light, too heavy, or about right?
8. Any difference between iOS, Android and web worth noting?
9. Anything slow, janky, or that flickered (navigation, sync, Results appearing)?
10. Which screen titles still feel off, and what's wrong with them? Attach screenshots (#56).

### Handing it back to Claude

Paste this file, filled in, with the prompt below:

> Here are my manual test results for #59 (rerunning #27 and #42, plus the #56 checklist). For each failed or ⚠️ check, and each problem in the write-up: say whether it's a bug, a spec gap, or working as intended, and draft a GitHub issue (title, steps to reproduce, expected, actual) for the ones that need fixing. Then draft a comment for #27, #42 and #56 summarising what passed, what failed with links to the new issues, and what was skipped. Show me the drafts before posting anything.
