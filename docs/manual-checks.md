# Manual checks on the phone

The rerun asked for in **#59**, for the open `ready-for-human` issues:

- **#27** Test the redesign (#26) on a phone
- **#42** Manual checks: Assessment on a phone and on web

The 2026-10-27 run was iOS only. Its results are in the comments on #27 and #42. Checks that passed there with no follow-up are kept here only for Android. Everything that failed, was skipped, or was changed by a fix since is checked again on both.

Run from `apps/mobile` with `pnpm ios` / `pnpm android` (or `pnpm web` for the web-width checks). If something breaks, `apps/mobile/.expo/dev.log` has the error.

For each check, tick the box and fill in the result. Leave **Notes** empty when it passes cleanly; write what you saw when it doesn't, or when something felt off even if it technically passed.

Result codes: **✅ pass** · **❌ fail** · **⚠️ works but feels off** · **⏭ skipped / couldn't test**

## Session

- Date: 2026-11-03, with a rerun on 2026-11-04 on fresh accounts, run by Claude Code driving the simulators
- Device(s) and OS version: iPhone 16e simulator, iOS 26.2; Android emulator (sdk_gphone16k_arm64), Android 17
- Build (dev build / Expo Go / web, browser): Expo Go on both, with Metro and the API running locally against the real database and the Clerk dev instance. Web: `pnpm start` in the app's built-in browser at phone widths (430 and 390 px), and the Playwright storage spec passes in Chromium
- Branch and commit: dev, 8809710

## Before you start

- **Android sign-in works in Expo Go now** (#44). Test accounts on the Clerk dev instance: `mc-dumbbells+clerk_test@example.com` and `mc-44-android+clerk_test@example.com`. A `+clerk_test` email takes the code `424242`.
- **Typing on the iOS simulator** didn't work at all last time but worked on a physical phone. Do the typing checks (R12, K1) on a physical iPhone if the simulator still won't type.
- **Info still missing** (#59), collect it while you go:
  - a screen recording of scrolling between Exercises (#54), if it still feels janky;
  - screenshots of the screen titles that "feel weird", and which screens (#56).

### Tooling: driving the simulators

- **iOS:** Claude Code's iOS Simulator tool taps, types and takes screenshots, and typing works there. Plain `xcrun simctl` gives screenshots, `openurl` and `ui … appearance` only. Expo Go's gear sits on the header ⋯: drag it out of the way.
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
  - Android: Result: ⏭ · Notes: Half done. Create account reached onboarding (done by hand, 2026-11-04). Sign in, then Sign out and Create account again in one session, still need a person: the agent can't complete Clerk's hosted page.
- [x] **S2** Android: closing the Clerk tab with ✕ returns to Sign in, and Sign in opens a new tab.
  - Android: Result: ✅ · Notes: Closed with ✕ twice; each time back on Sign in, and Sign in opened a new tab. Rerun 2026-11-03.
- [x] **K1** Straight after creating a new account, typing works in onboarding and in a stepper without restarting Expo Go (#48).
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: New account on both: typed all of onboarding, then reps in a stepper (5 → 8), with no restart.

### 0.2 Headed screens (#45)

- [x] **H1** On Profile, a Workout, Finish and Assessment results, the content starts below the header and status bar, and the first row can be reached.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Checked Profile, a Workout, Finish and Results on both.

---

## Part 1: Redesign on a phone (#27)

### 1.1 Finish › Edit times

Blocked last time by #45.

- [x] **R1** iOS: the compact date and time pickers open and work.
  - iOS: Result: ✅ · Notes: Summary line is 24-hour ("19:53") while the pickers are 12-hour ("7:53 pm").
- [x] **R2** Android: the date dialog and the time dialog open and work. The time dialog changes only the time of day, not the date.
  - Android: Result: ✅ · Notes: Time dialog is 24-hour, app shows "6:58 PM". Date survives a time change and the reverse.
- [x] **R3** Edited start and end times are saved (reopen the Workout in History and check).
  - iOS: Result: ✅ · Android: Result: ✅ · Notes:

### 1.2 In-progress Workout

- [x] **R4** The in-progress Workout opens full-screen over the tabs.
  - Android: Result: ✅ · Notes:
- [x] **R5** Leave workout returns to the tab you came from. (Try starting from more than one tab.)
  - Android: Result: ✅ · Notes: Back returned to Profile (Retake). Saving returned to History when opened from the pill there.

### 1.3 Tab bar

- [x] **R6** The bottom safe-area inset looks right (nothing under the gesture bar, no big empty gap).
  - Android: Result: ✅ · Notes:
- [x] **R7** Tab labels aren't clipped.
  - Android: Result: ✅ · Notes:

### 1.4 Resume pill

- [x] **R8** With a Workout in progress, the Resume pill shows above the tab bar on History, Exercises and Profile.
  - Android: Result: ✅ · Notes:
- [x] **R9** The Resume pill does **not** show on Today.
  - Android: Result: ✅ · Notes: Today shows the Resume workout button instead.
- [x] **R10** Tapping the pill reopens the Workout.
  - Android: Result: ✅ · Notes:

### 1.5 Steppers (#47, #57, #58)

- [x] **R11** − and + both step kg, reps and seconds. − never goes below zero.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: iOS floor for kg is the lightest dumbbell. Seconds step by 5 checked on Android.
- [x] **R16** A tap steps once. Holding − or + keeps stepping, speeds up the longer it's held, and stops on release.
  - iOS: Result: ✅ · Android: Result: ✅ · Web: Result: ✅ · Notes: Hold: iOS 19→50 kg in 4 s, Android reps 0→18 in 2 s, web reps 6→36 in 2.4 s; all stopped on release. Web hold used scripted mouse events; a real click stepped once.
- [x] **R17** With dumbbells, kg steps through your actual dumbbells, in both a Manual Workout and an Assessment test. With a barbell (2.2), it steps through bar plus plate pairs.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: iOS: dumbbells in an Assessment test, and bar plus plate pairs (40→50 with 5, 10, 20 kg plates). Android: plate pairs (40→45, 40→35). Dumbbells in a Manual Workout not tried on either.
- [x] **R18** Type a kg value between two of your loads. − and + go to the nearest real load below or above it. At the heaviest load, + stays put.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: 19 + → 20 (iOS). 41 − → 40, 41 + → 45 (Android). Stays at the top (50 kg) on iOS; top not tried on Android.
- [x] **R19** An Exercise your primary Equipment Profile has no loads for (for example a machine you don't own) steps kg by 2.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Lat pulldown stepped by 2 on both.

### 1.6 Keyboard Done (#56)

- [ ] **R12** On the number pad, Done shows as a round tick floating above the keyboard (Liquid Glass on iOS 26) and dismisses the keyboard. Take a screenshot.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: iOS screenshot taken. Android: not applicable, KeyboardDoneBar is iOS-only by design, and the emulator uses a hardware keyboard.
- [x] **R20** Onboarding's Cancel and Sign out are muted body text, not pressed against the progress bar.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes:

### 1.7 Set actions and the sheet (#56)

- [x] **R13** A logged Set's ⋯ shows a pen, a trash can and a tick in the row. Only one row has them open at a time. The tick closes them, and closes the editor if that Set was being edited. Touch targets feel at least 44pt.
  - iOS: Result: ⚠️ · Android: Result: ✅ · Web: Result: ✅ · Notes: iOS (390 pt wide): with the actions open "10 kg × 5" wraps to two lines and the row jumps. Android stays on one line. Web: "12 kg × 5" stays on one line at 430 px and "5 kg × 1" at 390 px; "10 kg × 5" at 390 px not tried. Web: opening Set 2's actions closes Set 1's, the tick closes the editor too, and targets are 44 px. "One row at a time" not tried on iOS or Android.
- [x] **R21** The pen opens the editor below and stays highlighted while editing. The editor has only Cancel.
  - iOS: Result: ✅ · Android: Result: ✅ · Web: Result: ✅ · Notes: Editor has Save set and Cancel, no Delete.
- [x] **R22** Deleting a Set asks first, including while that Set is being edited.
  - iOS: Result: ✅ · Android: Result: ✅ · Web: Result: ✅ · Notes: Asked while editing, on all three. Web also asked when not editing.
- [x] **R23** Delete exercise asks first, with and without Sets, from both the current box and a collapsed row.
  - iOS: Result: ✅ · Android: Result: ✅ · Web: Result: ✅ · Notes: iOS: current box with a Set. Android: current box with no Sets, collapsed row with a Set. Web: all four cases asked first. Collapsed row with no Sets not tried on iOS or Android.
- [x] **R24** iOS: the confirmations opened from a ⋯ sheet appear: Delete exercise, Discard workout, and Delete workout on a History Workout.
  - iOS: Result: ✅ · Notes: Delete exercise, Discard workout and Delete workout all appear.
- [x] **R25** Dragging the sheet's handle down closes it, and a short drag springs back. On web, try both mouse and touch.
  - iOS: Result: ✅ · Android: Result: ✅ · Web: Result: ✅ · Notes: Handle: short drag springs back, long drag closes, on iOS and Android. Web: a slow short drag stayed open and a slow long drag closed, with mouse and with touch, but only as scripted events: no real finger, and the spring-back animation wasn't watched. A fast short drag closes the sheet, as a flick (`CLOSE_VELOCITY`).
- [x] **R26** The longer picker sheets (onboarding and Profile selects) still scroll back up, rather than closing.
  - iOS: Result: ✅ · Android: Result: ✅ · Web: Result: ✅ · Notes: Failed first (Android closed on 4 of 8 drags), fixed in the same run: the sheet only takes a downward drag once its list is at the top. Retest: 0 of 8 closed. Web: the mouse wheel scrolled back to the top, and neither a real mouse drag nor scripted touch drags inside the scrolled list closed it; real finger scrolling not tried. Side effect on both: long lists now close from the handle, not by dragging the list at the top. Short sheets that don't scroll still close by dragging them.
- [x] **R27** Assessment Workouts have no Exercise ⋯, and History's Set rows look the same as before.
  - iOS: Result: ✅ · Android: Result: ✅ · Web: Result: ✅ · Notes: No Exercise ⋯ in Assessment Workouts on any of the three. No earlier build to compare History rows against.

### 1.8 Scrolling (#54, #63)

- [x] **R28** With the current box filling the screen, a drag that starts anywhere in it (title, banner, labels, gaps) scrolls the Workout, so the RPE chips and Log set can be reached.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Drag from the banner scrolled to RPE and Log set on both.
- [ ] **R29** Scrolling between Exercises and tapping rows to switch feels smooth, and the newly current Exercise is in view. If not, record the screen.
  - iOS: Result: ⏭ · Android: Result: ⚠️ · Notes: Android: tapping a row switches and it's in view. Smoothness can't be judged by an agent; no recording.

### 1.9 Light and dark

- [x] **R14** The app follows the phone's light/dark setting, including when it's switched while the app is open.
  - Android: Result: ✅ · Notes: Switched live while the Workout was open.

### 1.10 Expo Go

- [x] **R15** Does Expo Go include `@expo/ui` (which the pickers need)? Open Finish › Edit times in Expo Go and note what happens.
  - iOS: Answer: Yes, native pickers work in Expo Go · Android: Answer: Yes, Material dialogs work in Expo Go · Notes:

---

## Part 2: Assessment (#42)

### 2.1 Weighted Assessment, dumbbells only (#35, #36)

- [x] **A1** Today offers **Assessment A**. Starting it adds goblet squat, dumbbell Romanian deadlift and plank, in that order, and opens on goblet squat (#49).
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Android order seen with kettlebells (goblet squat, DB RDL, plank).
- [x] **A2** You can't add, remove or reorder its Exercises.
  - Android: Result: ✅ · Notes: No Add exercise or Exercise ⋯.
- [x] **A3** The first suggested load is one of your dumbbells, the heaviest at or below half your likely maximum.
  - Android: Result: ✅ · Notes: Real loads suggested (40 kg bar, 8 kg kettlebell). The half-of-maximum rule not independently worked out.
- [x] **A4** Each Set needs an RPE chip (6–10), and Log set stays disabled until one is picked (#51).
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Tapping disabled Log set does nothing.
- [x] **A5** The guidance shows as a banner in the current box, like "Next: 14 kg × 5, then rate it", and moves through your actual dumbbells. It's easy to see between Sets (#53).
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Android, dumbbells 5, 8, 10, 12, 14, 16, 18 kg: after 16 kg the banner says "Next: 18 kg × 5, then rate it".
- [x] **A6** A Set rated RPE 9 or higher marks the test done. The banner turns to Done, Log set is replaced by **Next test**, and no more Sets can be logged. The done test stays open until you tap Next test (#52).
  - iOS: Result: ✅ · Android: Result: ✅ · Notes:
- [x] **A7** The plank is one Set, logged in seconds.
  - Android: Result: ✅ · Notes: Log set is enabled at 0 s/0 reps; a 0-rep log is refused with an "Enter reps" toast.
- [x] **A14** After the last test, the banner says to finish the Workout (not "On to the next test") and Finish becomes the main button. Finish is still there, as a secondary button, before every test is done.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes:
- [x] **A8** After finishing A, Today offers **Assessment B**, which opens on push, then pull (#49).
  - iOS: Result: ✅ · Android: Result: ✅ · Notes:
- [x] **A9** After finishing B, both the finish toast and Today lead to the Results screen. Its first test isn't under the header (#45), and the back button is a bare chevron, not "(tabs)" (#46).
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Expo Go's gear partly covers "See results" on iOS (dev only).
- [x] **A10** Results lists each test with its Exercise, its top Set and an estimated maximum like "16.8 kg".
  - Android: Result: ✅ · Notes:
- [x] **A11** The plank shows its seconds as "Held".
  - Android: Result: ✅ · Notes:
- [x] **A12** Results shows starting Working Levels, grouped by Pattern, for every Exercise available in the primary Equipment Profile.
  - Android: Result: ✅ · Notes:
- [x] **A13** Each Working Level is rounded to a dumbbell you have.
  - Android: Result: ✅ · Notes: Fixed set 5, 10, 12 kg.

### 2.2 Barbell (#36)

- [x] **B1** With a full home gym, the tests are back squat, deadlift, barbell bench press and pull-up. Moving between the four is easy (#63).
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Back squat, deadlift, plank, then bench, pull-up.
- [x] **B2** Load suggestions and the kg stepper both step through real plate pairs (#58).
  - iOS: Result: ✅ · Android: Result: ✅ · Notes:
- [x] **B3** Results rounds Working Levels to loads the plates can make.
  - Android: Result: ✅ · Notes: 35, 45, 25, 20 kg with a 20 kg bar and 2.5/5/10/20 plates.

### 2.3 Bodyweight only (#37)

- [x] **W1** With an Equipment Profile that has no equipment, A and B both finish. Holding + gets to high reps quickly (#57).
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: 27 reps in a 2.5 s hold on iOS. No equipment now has no pull test (Inverted row needs a bar or table), so B is push only and Today says pull is estimated.
- [x] **W2** Bodyweight tests ask for one Set of as many reps as you can, with no RPE. After that Set, Log set is replaced by Next test, and a second Set can't be logged (#52).
  - iOS: Result: ✅ · Android: Result: ✅ · Notes:
- [x] **W3** Results shows the reps done as "Rep maximum", plus Working Levels.
  - Android: Result: ✅ · Notes:

### 2.4 Load-limited, untested and injured (#38)

L3–L5 failed last time because the floor press wasn't flagged for wrist injuries. It is now (494a6ac): rerun with the same setup.

- [x] **L1** With only light kettlebells, keep going past 12 reps at the heaviest without reaching RPE 9. The test ends, and Next test appears.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: 8 kg × 13 at RPE 7.
- [x] **L2** Results then shows "at least X kg · Limited by your equipment".
  - Android: Result: ✅ · Notes: "at least 11.2 kg · Limited by your equipment".
- [x] **L3** With a wrist injury, Today's Assessment B offer says "No test suits your injuries and equipment for push, so it's estimated from your other results."
  - iOS: Result: ✅ · Android: Result: ✅ · Notes:
- [x] **L4** B then starts with pull only.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes:
- [x] **L5** Results labels push "Not tested" and "Estimated from your other results", and its Working Levels say so too.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: iOS rerun after the fix: Working Levels now leave out what the injury rules out, so Push shows only the overhead presses. Android ran before that fix.
- [x] **L6** Finish a weighted test without reaching RPE 9. Results treats that Pattern as untested and estimated.
  - Android: Result: ✅ · Notes: RDL at RPE 7, then Finish early: Hinge and Core show as not tested and estimated.

### 2.5 Offline (#39)

Not run last time.

- [x] **O1** Finish A offline (airplane mode). Today offers B straight away.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Stand-in: API stopped, not airplane mode. Android used a Retake's A; Today offered B straight away.
- [x] **O2** Finish B offline. Today and Results both say "Results once synced".
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Stand-in: API stopped, not airplane mode. Today says "Results once synced"; no Results link until then, so that half of the check can't appear.
- [x] **O3** Get signal back. The Workouts upload and the Results appear.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Stand-in: API restarted, then background and foreground.

### 2.6 Out of order and retaken (#39)

Not run last time.

- [ ] **T1** With an A more than 14 days old and no B after it, Today also offers "Redo assessment A". (Fake the 14 days by changing the phone's date.)
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Android stand-in: fresh account, A finished and backdated 15 days in Edit times. Today offers B, plus "Your Assessment A was over 2 weeks ago" and Redo assessment A. iOS not run: its A was saved with today's date, and History has no Edit times, so it needs another fresh account.
- [ ] **T2** Dismiss the offer. It stays hidden until the offer changes, for example when A goes stale.
  - iOS: Result: ⚠️ · Android: Result: ⚠️ · Notes: Dismissed offer stays hidden on both (iOS: straight after dismissing, not rechecked later; Android: across tabs). Android: a Retake's new A brought an offer back. A dismissed offer returning because A went stale wasn't seen in the app, which needs a changed phone date; `assessment-offer.test.ts` covers it.
- [x] **T3** Retake from Profile. Doing A and B again replaces the Working Levels on Results.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes:
- [x] **T4** With a Workout in progress, Profile says to finish it first instead of showing Retake.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes:

### 2.7 Everywhere

- [x] **E1** Assessment Workouts show in History.
  - Android: Result: ✅ · Notes:
- [x] **E2** They count toward this week's Volume.
  - Android: Result: ✅ · Notes:
- [x] **E3** Their Sets show as Previous Sets in later Workouts.
  - Android: Result: ✅ · Notes: "Last: 19 kg × 5, 5".
- [x] **E4** Results, Today and the logging screen read well in light and dark mode, including the banner's info and success colours. (Blocked last time by #45.)
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: iOS: Today, logging, banners and Results. Android: logging, Today and banners.

**Assessment unavailable:** reachable now that Inverted row needs a bar or table: No equipment with a wrist injury leaves B with no test. Not run by hand; `canAssess` and `assessmentOffer` unit tests cover it.

---

## Write-up

Answer these after the run, while it's fresh. Short answers are fine.

### Overall

1. Would you merge / ship as it is? If not, what's the one thing that blocks it?

   The one blocker was R26, now fixed. Still open: the second half of S1 and iOS T1.

2. Which checks failed (IDs)? For each: what you did, what you expected, what happened, and whether it happens every time.

   R26 (Android) failed in the first run: after scrolling down Select weights, dragging back up closed the sheet on 4 of 8 tries. Fixed; 0 of 8 on retest. Nothing else failed.

3. Which checks did you skip, and why (no device, couldn't set up the state, ran out of time)?

   S1 (part): needs a person on Clerk's hosted page. iOS T1: needs a fresh account. T2 (part): needs a changed phone date. Web: real finger gestures (R25, R26), because the browser driver sends mouse events and scripted touch stood in. R29: smoothness needs a person. Android R12: not applicable. Offline used a stopped API instead of airplane mode.

### Beyond the checklist

4. Anything that broke or looked wrong that no check covers?

   iOS: on the first Workout after launch the bottom bar sits about 34 pt lower, and Save workout touches the home indicator. With the Gym option (no loads) Working Levels can go below an empty bar: Barbell back squat 7 kg × 8. Android's Finish summary shows one date when the start and end dates differ ("Tue Oct 20, 7:01 AM – 7:07 AM" with the end still on 4 Nov). Fixed in this run: Inverted row with no equipment, and wrist-loading Working Levels.

5. Any wording on screen that was confusing, too long, or didn't match what the app did? Quote it.

   "5 of 3 Workouts" on Today. "One-arm dumbbell row" and "Dumbbell Romanian deadlift" for a kettlebell-only profile. Times are 24-hour in the summary and 12-hour in the iOS pickers, the reverse in the Android dialog. "Skip anything you're not sure of" on the weights step, but choosing Adjustable makes all three fields required.

6. Where did you hesitate or have to think about what to tap next?

   Agent run, so not a fair answer. Finish is available during an Assessment and shows what's left out ("Left out, with no Sets: Deadlift, Plank"), which reads well.

7. Did the suggested loads and the Working Levels feel believable for you? Too light, too heavy, or about right?

   Can't judge: Sets were made up, so low Working Levels reflect the test data. Please answer this yourself.

8. Any difference between iOS, Android and web worth noting?

   R26 and the R13 row wrap each show up on one platform only. Done tick is iOS-only. Web matched the phones in all eight checks run there.

9. Anything slow, janky, or that flickered (navigation, sync, Results appearing)?

   Can't judge smoothness from screenshots. Nothing obviously slow; sync after reconnecting took a few seconds at most.

10. Which screen titles still feel off, and what's wrong with them? Attach screenshots (#56).

Left for you. Expo Go's gear covers header buttons in dev, which affects how titles look.

### Handing it back to Claude

Paste this file, filled in, with the prompt below:

> Here are my manual test results for #59 (rerunning #27 and #42, plus the #56 checklist). For each failed or ⚠️ check, and each problem in the write-up: say whether it's a bug, a spec gap, or working as intended, and draft a GitHub issue (title, steps to reproduce, expected, actual) for the ones that need fixing. Then draft a comment for #27, #42 and #56 summarising what passed, what failed with links to the new issues, and what was skipped. Show me the drafts before posting anything.
