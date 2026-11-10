# Manual checks on the phone

Checks still to run for Planned Workouts (spec #77). The rest passed on an iPhone 14 on 2026-11-06.

Run from `apps/mobile` with `pnpm ios` / `pnpm android`. If something breaks, `apps/mobile/.expo/dev.log` has the error. Use a physical phone where you can: airplane mode is the point of the offline checks.

For each check, tick the box and fill in the result. Leave **Notes** empty when it passes cleanly; write what you saw when it doesn't, or when something felt off even if it technically passed.

Result codes: **✅ pass** · **❌ fail** · **⚠️ works but feels off** · **⏭ skipped / couldn't test**

## Session

- Date: 2026-11-06
- Device(s) and OS version: iPhone 17 Pro simulator, iOS 26.4
- Build (dev build / Expo Go / web, browser): Release simulator build, API on localhost
- Branch and commit: `dev`, ecdf9a5
- Simulator run: it has no airplane mode, so "offline" here means the API was down and Clerk stayed online. Ticked boxes passed here on iOS only.
- Phone run, 2026-11-09: iPhone 14, Release build from `fix/p11-clerk-offline-cold-start`, real airplane mode. P11 to P15 and P20 passed.
- Simulator run of M5's gaps, 2026-11-09: iPhone 17 Pro simulator (iOS 26.4) and a Pixel emulator (Android, 411 dp wide), both in Expo Go from `feat/m5-gaps` at 01eacab. Each had its own in-memory API (`dev:local` plus the seeded Exercises) and the Clerk stub. Onboarding, the Assessment and the leg days for W1 were posted to the API rather than tapped through. "Offline" means that device's API was cut off; the device kept its network. Vibration was read from Android's vibrator log.

## Before you start

- **Test accounts** on the Clerk dev instance: a `+clerk_test` email takes the code `424242`.

### A release build, for P11 and P14

Expo Go can't reload offline, and the repo has no EAS setup until M8, so build locally on your Mac. A Release build carries its JavaScript inside the app, so it opens with no Metro and no signal.

#### iPhone, step by step

The API deployed on Render runs `main`, which has no Planned Workouts, so the phone talks to an API on your Mac over Wi-Fi instead.

**Once, on the Mac**

1. In Xcode, open **Settings → Apple Accounts** (**Accounts** in older Xcode), press **+** and add your Apple ID. A free one works: it shows up as "Your Name (Personal Team)".

**Once, on the iPhone**

2. Plug the phone into the Mac with a cable, unlock it and tap **Trust** when it asks about this computer.
3. In Xcode, open **Window → Devices and Simulators** and wait until the phone appears. That makes **Developer Mode** show up on the phone.
4. On the phone: **Settings → Privacy & Security → Developer Mode**, turn it on, let it restart, then tap **Turn On** after unlocking.

**Each time: start the API**

5. Put the phone and the Mac on the same Wi-Fi. From the repo root, start the API with this branch's code. It reads `apps/api/.env`, so it uses the real database and the Clerk dev instance:

   ```bash
   pnpm --filter @fit/api dev
   ```

6. Find the Mac's name on the network:

   ```bash
   echo "$(scutil --get LocalHostName).local"
   ```

   In Safari on the phone, open `http://<that name>:3000/health`. You should see `"status":"ok"`. If it doesn't load, the phone can't reach the Mac, and the app won't be able to either: check the Wi-Fi, and that the macOS firewall lets `node` accept connections.

**Build and install**

7. From `apps/mobile`, remove the `ios/` folder if it's there. The simulator run left one with a made-up app identifier:

   ```bash
   rm -rf ios
   ```

8. With the phone still plugged in and unlocked, build and install. The `LANG` settings stop CocoaPods failing (the error is easy to miss), and `EXPO_PUBLIC_API_URL` overrides `.env` for this build only:

   ```bash
   LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 EXPO_PUBLIC_API_URL="http://$(scutil --get LocalHostName).local:3000" npx expo run:ios --configuration Release --device
   ```

   - Pick your iPhone from the list.
   - It asks for an iOS bundle identifier, as `app.json` has none. Enter one only you would use, such as `com.asjscott.fitcoach`. It writes it into `app.json`: don't commit that.
   - If it asks for a signing team, pick your Personal Team.
   - The first build takes several minutes. It ends by installing the app on the phone.
   - If it fails on signing, open `ios/mobile.xcworkspace` in Xcode, select the **mobile** target, then **Signing & Capabilities**: tick **Automatically manage signing**, pick your team, and run the command again.

   Signing errors you may hit:

   - **"No Accounts"**, together with **"No profiles for '…' were found"**: Xcode isn't signed in to any Apple account. Do step 1, then run the command again.
   - **"Personal development teams … do not support the Sign In with Apple capability"**: `@clerk/expo` adds Sign in with Apple to the build by default. The app doesn't use it, but a free Apple ID can't sign an app that asks for it. Remove it from the generated project (it isn't committed), then run the command again:

     ```bash
     /usr/libexec/PlistBuddy -c 'Delete :com.apple.developer.applesignin' ios/mobile/mobile.entitlements
     ```

     Removing `ios/` brings the setting back, so do this again after step 7.

**First launch**

9. If the phone says "Untrusted Developer": **Settings → General → VPN & Device Management**, tap your Apple ID under Developer App, then **Trust**.
10. Open the app. When it asks to find devices on your local network, tap **Allow**. Without it the app can't reach the API on your Mac.
11. Sign in with a test account and finish the Assessment, so Today has a plan. Run P11 from there, then P14, and P12, P13, P15 and P20 while you're in real airplane mode.

**Airplane mode**

- iOS turns Wi-Fi back on in airplane mode if you've done that before. Check in Control Center that Wi-Fi and Bluetooth are both off, or the "offline" checks aren't offline.
- To force-quit, swipe up from the bottom, pause, then swipe the app's card away.

**Afterwards**

12. From `apps/mobile`, undo the bundle identifier in `app.json`:

    ```bash
    git checkout app.json
    ```

    With a free Apple ID the app stops opening after 7 days. Run step 8 again to reinstall.

#### Android

```bash
npx expo run:android --variant release --device
```

- The first run generates `android/`, which is gitignored, and asks for a package name, as `app.json` has none. Don't commit either.
- Same API rule as iOS: build with `EXPO_PUBLIC_API_URL` pointing at the Mac, not Render.

### Tooling: driving the simulators

- **iOS:** Claude Code's iOS Simulator tool taps, types and takes screenshots, and typing works there. Plain `xcrun simctl` gives screenshots, `openurl` and `ui … appearance` only. Expo Go's gear sits on the header ⋯: drag it out of the way.
- **Android:** `adb` (in `~/Library/Android/sdk/platform-tools`, not on `PATH`) works for taps, typing, screenshots and `uiautomator dump`. The Clerk custom tab's contents aren't in the uiautomator tree, but `adb forward tcp:9222 localabstract:chrome_devtools_remote` exposes the page over the Chrome DevTools Protocol.

---

## Timing

- [ ] **P9** The estimated time is honest: run a full Standard Workout with a timer. The 5-minute warm-up is a spec assumption "unless it proves wrong on a phone".
  - iOS: Result: · Android: Result: · Notes:

## Real offline (airplane mode)

Expo Go can't reload offline. Load the app, then turn on airplane mode without closing it: that covers P12, P13, P15 and P20. P11 and P14 need a force-quit, so they need a release build on the phone.

- [x] **P11** **Clerk on a cold start with no signal.** Have a plan on Today, turn on airplane mode, force-quit, reopen. Today and the card should appear. If the app stays blank, Clerk's `isLoaded` stayed false: `(app)/_layout.tsx` renders nothing until then, and nothing else can pass. The stand-in couldn't show this. A likely fix is `__experimental_resourceCache` from `@clerk/expo/resource-cache`.
  - iOS: Result: ✅ · Android: Result: · Notes: Blank until Clerk was given its resource cache. With it, Today and the card appear in airplane mode.
- [x] **P12** Still in airplane mode: change the Length and equipment. The card follows, with your usual Length still selected first.
  - iOS: Result: ✅ · Android: Result: · Notes: Standard was selected first. Short went from 8 Exercises and 23 Sets to 5 and 15; Bodyweight only swapped in alternatives.
- [x] **P13** Start, log and finish. Start isn't held up by the Previous Sets request for long (each has a 4 s timeout). Today says "Connect to plan your next Workout".
  - iOS: Result: ✅ · Android: Result: · Notes: With a server that never answers, the five Previous Sets requests ran in parallel and Start took about 4 s. Finish was with connections refused. "Connect to plan your next Workout" showed. Offline, the ring went from 3 of 3 to 1 of 3, as History isn't known.
- [x] **P20** After that finish, Today shows "Done for today." with "Connect to plan your next Workout" on the card.
  - iOS: Result: ✅ · Android: Result: · Notes: "Done for today." with "Connect to plan your next Workout" on the card.
- [x] **P14** Force-quit and reopen, still offline: the Pending Workout, the message and native storage all hold.
  - iOS: Result: ✅ · Android: Result: · Notes: Force-quit and relaunch: the Pending Workout, the message and all three stored keys held. Clerk was still online, so this doesn't replace P11.
- [x] **P15** Turn signal back on, without touching the app, then with the app in the background. The upload and next plan arrive.
  - iOS: Result: ✅ · Android: Result: · Notes:

## Rest timer (#95)

`expo-keep-awake` is a new native module, so these need a new development or release build. Leave the phone's auto-lock at its usual setting (30 s to 1 min makes T2 quick).

- [x] **T1** Log a Goblet squat Set and wait out the rest (1:30). The phone vibrates once when it reaches 0, with no sound, and the timer goes. Then log a Set, put the app in the background past the end, and come back: the timer has gone, with no vibration on return.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Android logged one 400 ms vibration when the Goblet squat rest reached 0, and none when it came back from the background past a 2:30 deadlift rest. Separately, see R1: the walk gets a 19:30 rest.
- [ ] **T2** Rerun on both phones, on a Release build (`--configuration Release` / `--variant release`, not `pnpm ios`): a development build keeps the whole app awake. Don't watch the screen while you wait. Put the phone face down, or on iPhone turn off Settings › Face ID & Passcode › Attention Aware Features (on Android, Settings › Display › Screen attention). Either setting keeps the screen on while you look at it. Then:
  1. Before starting, leave the phone on Today past its auto-lock time: it locks. If it doesn't, the cause isn't the Workout, so note that and stop.
  2. Start a Workout and leave it on the logging screen, then on Today: the screen stays on.
  3. Finish, then leave it on Today and again on History: it dims and locks.
  4. Start another and Discard it, then leave it on Today: it locks.
  5. In airplane mode, start, log a Set and finish, so the Workout is Pending, then leave it on Today: it locks.
  - iOS: Result: · Android: Result: · Notes: Last run (iOS ⚠️, Android ⏭): the phone didn't lock after finishing, on Today or History (#108). #108 couldn't reproduce it. In Expo Go on the iPhone 17 Pro simulator, with Expo's dev hold removed, iOS's idle timer was read every 2 s. It came on at Start and went off at Discard, including after a trip to the background. On the web build, the wake lock was released after Finish and after Discard. Step 1 shows whether something outside the Workout is holding the screen on.

## Quick (#98)

- [x] **Q1** In airplane mode, open the Next Workout sheet and choose Quick. The Length row reads Quick, Short, Standard, Long and wraps rather than running off the screen on a narrow phone. The card shows about two Exercises and 20 minutes or less. Finish it once signal is back, and the next plan is on your usual Length again, with Profile still showing it.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Quick was 2 Exercises · 5 Sets · about 18 min. At 320 dp (display density raised) the row wraps, with Long on a second line. After finishing, the sheet was back on Standard and Profile read "Standard (45 minutes)". On iOS only the row was seen: one line at 402 pt.

## Daily check-in (#92)

- [x] **C1** With a plan on Today, the check-in card sits below "Time to train." (or "Rest today."). At phone width the five chips of each row fit on one line, with "Poor … Great" and "None … Very" under the ends, and nothing scrolls sideways. Start workout works without checking in.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Under "Rest today." on iOS and "Time to train." on Android. The chips still fit on one line at 320 dp.
- [x] **C2** In airplane mode, check in with sleep 1, energy 2, soreness 5. The card goes, and the day's card adds "· lighter after your check-in" with fewer Sets. Force-quit and reopen, still offline: the lighter Workout and no card.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: 6 Exercises · 16 Sets went to 4 · 11.
- [x] **C3** Open "See or change this Workout": it says "Lighter after your check-in". "Full workout" gives back the whole Workout, and tapping it again makes it lighter again. Change a rating there to all 5s and soreness 1: the Workout is full straight away.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Sleep 5 and energy 5 made it full even with soreness still at 5, and the sheet's layout jumps up as the lighter row goes, so the next tap can land on the wrong chip. Decided: soreness 5 lightens on its own (#112). The jump is #113.
- [x] **C4** Check in lighter, start the Workout, then go back to Today: the started Workout keeps its Sets. Finish it, and the card doesn't come back.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes:
- [ ] **C5** The next day the check-in is gone: the card is back (if there's a plan) and the Workout is full.
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Needs a real next day.

## The Coach says why (#94)

Needs the API deployed from this branch, so plans are stored with their reasons.

- [x] **W1** The day after a heavy leg day (6 or more Sets of squats or lunges the evening before), the "Time to train." card has a line under the Sets and time: "Legs are recovering from <that day>." The headline is unchanged. At phone width the line wraps rather than running off the card.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: "Legs are recovering from Sunday." The line was short enough to fit at 402 pt, so the wrap wasn't seen. Four Sets of goblet squats wasn't enough for the reason; six plus three lunges was.
- [x] **W2** Open "See or change this Workout": under the Sets and time it lists every reason, recovering first, such as "Legs are recovering from Tuesday." then "Back is furthest behind this week." Checking in lighter adds "lighter after your check-in" without taking the reasons away.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: iOS: "Legs are recovering from Sunday." then "Chest is furthest behind this week." Android, checked in lighter: "Back is recovering from today." and "Shoulders are furthest behind this week." stayed above "Lighter after your check-in".
- [ ] **W3** Once every Workout of the week is done and you train anyway, the line reads "This week's work is done. This one's extra."
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Not reached. The line comes from every Muscle's weekly Set budget being met, not from the Workout count. With 4 of 4 small Workouts done, Today said "4 of 4 Workouts" and the sheet still said "Shoulders are furthest behind this week." That may be fine after four full Workouts, but the check's wording and the code's rule differ. Decided: the Workout count is the rule, in #114.

## Supersets (#96)

A Workout pairs Exercises only when it wouldn't otherwise fit its Length, so choose Quick or Short on a plan of four or more Exercises. Pairs only form where the Patterns go together (push with pull or hinge, squat with core), never with a one-sided Exercise or a carry, so a plan without such Exercises may need Bodyweight only to swap some in. The sheet then says "Paired into supersets to fit the time" and shows "Superset with …" under each paired Exercise.

- [ ] **S1** P9's timing check on a paired Workout: start one whose sheet shows at least one superset, note its "About N min", and run it in full with a timer, resting as the timer says and skipping nothing. A pair is timed at Sets × (the longer Exercise's Set + 30 s): does the real time come out within a few minutes of the estimate?
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Deferred: timing checks (this and P9) wait until the app is in real use. A simulator can't run it, as a Set takes no time there.
- [x] **S2** On the logging screen at phone width, the pair is one box, A1 above A2. The Exercise whose turn it is is open with its steppers; the other shows its name, Sets so far and "Up next". Log A1: A2 opens straight away with "No rest: straight to …" and no rest timer. Log A2: the rest timer runs the longer of the two rests, as the box's note says. The Sets show under their own Exercise in History afterwards.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Rests matched the box's note: 120 s for Romanian deadlift with overhead press (the longer of 120 and 90), 90 s for chin-up with lateral raise, 60 s for Y-T-W raise with decline push-up. ⚠️ When one of a pair runs out of Sets first (a 1-Set chin-up with 3 Sets of lateral raise), the lateral raise's later rounds still rest the pair's 90 s, not its own 45 s. ⚠️ "Superset with …" lower-cases the whole name: "barbell romanian deadlift", "prone y-t-w raise". The rest still running from one pair carries into the next box: working as intended, as it's the rest before the next Exercise. The name and the rest once one side is done are #111.
- [x] **S3** In airplane mode, open the sheet on a paired Workout and choose "No supersets": the pairs go, Sets are cut instead and the time stays within the Length. Tap it again and the pairs come back. Start without changing it, and the started Workout keeps the pairs.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Android, Standard: 7 Exercises · 19 Sets · about 40 min paired, 6 · 16 · about 39 min with No supersets. iOS, Quick on Bodyweight only: 11 Sets · 20 min paired, 10 Sets · 19 min without. Pairs only form where the Patterns go together (push with pull or hinge, squat with core) and never with a one-sided Exercise or a carry, so the iOS plan (a one-sided row, a carry and four pushes) had no pairs at any Length until Bodyweight only swapped in Exercises that pair. The tip above, Quick or Short on four or more Exercises, isn't always enough.

## Over time

These need real weeks of training on `dev`, so run them while M5's gaps are built.

- [ ] **P16** A new week: open the app on Monday. The plan is built for the new week, with nothing carried over. The walk couldn't show this, as it can't move the server's clock, so wait for a real Monday.
  - iOS: Result: · Android: Result: · Notes:
- [ ] **P17** Week after week, do the same Exercises carry on, and do Previous Sets stay useful?
  - iOS: Result: · Android: Result: · Notes:
- [x] **P18** Sign out: the plan and the stored User are gone from the phone, and the next account doesn't see them.
  - iOS: Result: ✅· Android: Result: · Notes: The storage table was empty after sign-out. Deleted bytes stayed in the SQLite file, which the app can't read. Signed in with second account and all good.

## Recovery Workout (#97)

Needs `pnpm --filter @fit/api seed:exercises` run once from the main checkout (it needs `apps/api/.env`), so the Exercises tab lists the five Recovery Exercises.

- [x] **R1** On a Rest Day, the "Rest today." card has a "Recovery workout instead" link. Tap it: a Workout opens with a 20-minute walk, then hip flexor stretch, open book, cat-cow and world's greatest stretch at 2 × 45 s each, logged on the normal timed-Set screen.
  - iOS: Result: ⚠️ · Android: Result: · Notes: The Exercises are right, but the walk reads "1200 s" rather than 20 minutes. Logging it starts a 19:30 rest (`restSeconds` is the Set's time less 30 s) and offers a Set 2, though the target is 1 Set. Decided: "20 min", no rest after the walk and no Set 2, in #109.
- [x] **R2** On a day that isn't a Rest Day, open the plan's sheet ("See or change this Workout"): "Recovery workout instead" is under Start, and starts the same Workout once the sheet has gone. Whatever Length is chosen, it's the same Workout.
  - iOS: Result: · Android: Result: ✅ · Notes: Tried with Quick chosen.
- [x] **R3** In airplane mode, start, log and finish a Recovery Workout. Today still offers the same Planned Workout (not "Connect to plan your next Workout"), This Week's count and day circles don't change, and tomorrow isn't a Rest Day because of it. Back online, it uploads and shows in History, and the plan on Today is the same one.
  - iOS: Result: ⚠️ · Android: Result: · Notes: Started online, then logged and finished offline (walk only). Today kept the plan and stayed at 0 of 4 with no day filled. It uploaded and the plan kept its id. But History's "This week" read "1 of 4 Workouts", counting the walk. And the card went from "Rest today." to "Time to train." while the walk was waiting to upload, then back to "Rest today." after it had (I had also posted a Workout to the API by then, which Today's count never showed, so that may have played a part). "Tomorrow" wasn't checked. Same result running on the built app. History's count is #110. The card's flip is working as intended: offline, Today knows only the Workouts on the phone, so it can miss a Rest Day but never make a wrong one (ADR 0001).

## Your call

Not a bug, but it needs your judgement once you've done some Workouts. Details in `docs/research/planner-simulation.md`.

- Do Workouts that fill their Length, at up to 214% of a Muscle's budget, feel like too much? Should a Workout stop at the budget? Left until after real use (2026-11-09).

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
