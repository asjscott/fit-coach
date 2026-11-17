# Manual checks on the phone

Checks still to run on a phone. The rest have passed.

For each check, tick the box and fill in the result. Leave **Notes** empty when it passes cleanly; write what you saw when it doesn't, or when something felt off even if it technically passed. Where a check already has a simulator result, replace it with the phone's and keep any note that still applies.

Result codes: **✅ pass** · **❌ fail** · **⚠️ works but feels off** · **⏭ skipped / couldn't test** · **🕒 skip for now: needs time to pass**

## What's left, and where

The simulators ran what they could on 13 Nov (Session 1 below). The rest falls into four groups.

**1. Run on the phones now**, on a Release build against the API on your Mac ([Setting up the phones](#setting-up-the-phones)):

| Check | What's left                                                                                                                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T2    | All of it, on both phones. It's only valid on a Release build.                                                                                                                                                                                         |
| C6    | iOS; Android passed on the emulator. Read "the staging database" as the one in `apps/api/.env`: look at `checkIns` in Atlas → Browse Collections.                                                                                                      |
| C7    | All of it, on both phones.                                                                                                                                                                                                                             |
| PR1   | iOS, after #146: See workout stays up ~10 s to tap; the detail rounds both numbers alike ("162 lb, up from 154 lb"). Android.                                                                                                                          |
| PR2   | All of it. Run it on the Release build in airplane mode, not the PWA: the PWA can't work offline until #124.                                                                                                                                           |
| J1    | Failed on the wording ("reps", not "contacts"): recheck once that's fixed. Flip the iOS switch with your finger. Android.                                                                                                                              |
| W1    | iOS. Both phones: no Elapsed timer on a past Workout, Time in hours and minutes (#144), and a span over 6 hours refused under End (#152). Skip the installed web app's date inputs: the web app on Cloudflare runs `main`, which has no past Workouts. |
| R1    | The "Rest today." card on a real Rest Day, and iOS.                                                                                                                                                                                                    |
| R2    | All of it, on both phones.                                                                                                                                                                                                                             |
| U1    | The Equipment Profile's weights screen, and the 5 lb / 2 kg step on a home profile with dumbbells but no weights entered. Android.                                                                                                                     |
| U2    | All of it, on both phones.                                                                                                                                                                                                                             |
| LS1   | iOS, after #149 and #155: Renegade row is planned on a dumbbell and steps 25 → 30 lb. Android.                                                                                                                                                         |
| LS2   | Android, and the home-profile variant (a cable machine selected).                                                                                                                                                                                      |
| RPE1  | The chips after every Set in a Manual Workout. Android.                                                                                                                                                                                                |
| L1    | Android.                                                                                                                                                                                                                                               |
| DP2   | Android.                                                                                                                                                                                                                                               |

DP1 and RPE2 passed on both simulators. Look at them on a phone only if you have time.

**2. Run when you next train**: a full Workout with a timer, resting as the timer says. Both can be one session.

- **P9** a full Standard Workout.
- **S1** a Workout whose sheet shows a superset.

**3. 🕒 Skip for now: they need time to pass.** Leave them unticked. They come due while you use the app:

| Check    | Due when                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------- |
| C5       | The day after a check-in.                                                                                |
| P16      | The first Monday after you start.                                                                        |
| J2       | After a week with "Include jumps" on.                                                                    |
| P17      | After a few weeks of training.                                                                           |
| DL1, DL2 | The 5th week of a Block: the week starting 4 Mondays after the Monday of the week Assessment B was done. |

**4. On hold: written for staging.** E1–E3 check Sentry on a staging deploy, and `dev` isn't deployed anywhere. They need rewording for production before they can run.

`dev` runs only on your Mac: nothing deploys it. The checks that say "on the installed PWA against staging" run on the phone builds against the API on your Mac instead. The installed web app comes later, with #120 (offline sign-in) and #124 (offline web app).

## Session 1: simulators

- Date: 2026-11-13
- Device(s) and OS version: iPhone 17 Pro simulator (iOS 26.4); Android emulator (Android 17). Run by Claude, not on a phone.
- Build (dev build / Expo Go / web, browser): Expo Go, with the Clerk stub (`CLERK_STUB=1`) against the in-memory API with the exercise library seeded. Profile and Assessment set up through the API: athletic, 3 days, Standard, Full gym.
- Branch and commit: dev, 0981757

## Session 2: phones

- Date: 2026-11-16
- iPhone model and iOS version: iPhone 14 27.0.1
- Android phone model and Android version: Not completed
- Build: Release, against the API on the Mac (`pnpm --filter @fit/api dev`)
- Branch and commit:

## Session 3: simulators, after the fixes

- Date: 2026-11-16
- Devices: iPhone 17 Pro simulator (iOS 26.4, on Mountain time); Android emulator (Android 17, Pacific). Run by Claude.
- Build: Expo Go with the Clerk stub, each against its own in-memory API with the Exercise library seeded. Profile and Assessment set up through the API: athletic, 3 days, Standard, Full gym, lb.
- Branch and commit: spec/119-m6-fixes (PR #151), 187766d
- Run: the checks PR #151 lists (J1, PR1, PR2, W1, R2, C7, U2, LS1), most fully on Android. iOS ran J1, U2, LS1's target and #150; its injected taps often need a second try, so the rest share Android's result.
- Also found:
  - **#150 reproduces on iOS.** A Workout on Wed 28 Oct sits under "25 Oct – 31 Oct" in History; the week is 26 Oct – 1 Nov. The next week reads "2 Nov – 8 Nov", correctly. #150's test passes in Node for Edmonton, so suspect iOS's JavaScript engine (Hermes) and its local dates across the clock change.
  - LS1: see its notes. Renegade row is seeded on a kettlebell.

## Setting up the phones

### What you're building, and why

- **A Release build.** Its JavaScript is inside the app, so it opens with no Metro and no signal, which the airplane-mode checks need. Expo Go and `pnpm ios` can't do that, and a development build keeps the screen awake, which spoils T2.
- **It talks to the API on your Mac, over Wi-Fi.**
  - Production (Render and Cloudflare) runs `main`, and `dev` isn't deployed anywhere, by choice.
  - So the Mac stays awake, with its lid open, on the same Wi-Fi as the phones, with the API running for the whole session.
  - Offline checks still work: the phone keeps the Workout Pending and uploads it when it's back on the Mac's Wi-Fi.
- **Changed the app's code?** Rebuild and reinstall (step 8 or 12): a Release build doesn't reload. The API restarts by itself when its code changes.
- **At home.** Away from the Mac's Wi-Fi, the app logs offline but can't upload or get a new plan until it's back.

### Once, before the first session

1. **`.env` files.** `apps/api/.env` and `apps/mobile/.env` exist, filled in from their `.env.example`.
   - `apps/mobile/.env` needs `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
   - `CLERK_STUB` must not be set anywhere: these builds use the real Clerk development instance.
2. **Check which database you'll change.**
   - `apps/api/.env`'s `MONGODB_URI` is the database these checks use.
   - When the API starts from `dev`, it runs M6's migrations on that database: Working Levels become a load and a target.
   - Production's API on Render runs `main`, which has M5 but not M6. Make sure it doesn't use the same `MONGODB_URI`, or these migrations change what production reads. Check its environment variables in Render.
3. **Seed the Exercise library**, from the repo root:

   ```bash
   pnpm --filter @fit/api seed:exercises
   ```

   It adds the jumps, the Recovery Exercises and the library gaps that J1, R1 and L1 need. It's safe to run again.

4. **A test account** on the Clerk development instance: any email with `+clerk_test` in it, such as `you+clerk_test@example.com`, signs in with the code `424242`.

**iPhone, once**

5. In Xcode, open **Settings → Apple Accounts** (**Accounts** in older Xcode). Press **+** and add your Apple ID. A free one works: it shows up as "Your Name (Personal Team)".
6. Plug the phone into the Mac, unlock it and tap **Trust**. In Xcode, open **Window → Devices and Simulators** and wait until the phone appears. Then on the phone, go to **Settings → Privacy & Security → Developer Mode**. Turn it on, let the phone restart, then tap **Turn On** after unlocking.

**Android phone, once**

7. **Settings → About phone**: tap **Build number** 7 times. Then in **Settings → System → Developer options**, turn on **USB debugging**. Plug the phone in and allow debugging from this Mac. This should list it as `device`:

   ```bash
   ~/Library/Android/sdk/platform-tools/adb devices
   ```

### Each session: start the API

8. Put the Mac and both phones on the same Wi-Fi. From the repo root, start the API. `caffeinate` keeps the Mac from sleeping while it runs:

   ```bash
   caffeinate -i pnpm --filter @fit/api dev
   ```

   Leave it running in its own terminal. It reads `apps/api/.env` and listens on port 3000.

9. Find the Mac's addresses. The iPhone uses its name, and the Android phone uses its IP address:

   ```bash
   echo "iPhone:  http://$(scutil --get LocalHostName).local:3000"
   ```

   ```bash
   echo "Android: http://$(ipconfig getifaddr en0):3000"
   ```

   On each phone, open its address with `/health` on the end in the browser. You should see `"status":"ok"`. If it doesn't load, the app can't reach the API either: check the Wi-Fi, and that the macOS firewall lets `node` accept connections (System Settings → Network → Firewall).

### Build and install: iPhone

10. **Plug in and unlock the phone.** From `apps/mobile`, build and install. Keep the existing `ios/` folder.
    - Your 9 Nov build already set it up: bundle identifier `com.asjscott.mobile`, and Sign in with Apple removed. Native dependencies haven't changed since.
    - The `LANG` settings stop CocoaPods failing (the error is easy to miss).
    - `EXPO_PUBLIC_API_URL` overrides `.env` for this build only.

    ```bash
    LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 EXPO_PUBLIC_API_URL="http://$(scutil --get LocalHostName).local:3000" npx expo run:ios --configuration Release --device
    ```

    - Pick your iPhone from the list, not a simulator.
    - If it asks for a signing team, pick your Personal Team.
    - The first build takes several minutes, and ends by installing the app on the phone.

    If it fails:
    - **On signing:** open `ios/mobile.xcworkspace` in Xcode and select the **mobile** target, then **Signing & Capabilities**. Tick **Automatically manage signing**, pick your team, and run the command again.
    - **"No Accounts"**, with **"No profiles for '…' were found"**: Xcode isn't signed in to an Apple account. Do step 5, then run the command again.
    - **"Personal development teams … do not support the Sign In with Apple capability"**: `@clerk/expo` adds Sign in with Apple to the build by default. The app doesn't use it, but a free Apple ID can't sign an app that asks for it. Remove it from the generated project, which isn't committed, then run the command again:

      ```bash
      /usr/libexec/PlistBuddy -c 'Delete :com.apple.developer.applesignin' ios/mobile/mobile.entitlements
      ```

    - **Starting `ios/` again:** run `rm -rf ios`, then the command again. It asks for a bundle identifier: enter `com.asjscott.mobile`. Then remove Sign in with Apple as above.

11. **First launch.**
    - If the phone says "Untrusted Developer", go to **Settings → General → VPN & Device Management**. Tap your Apple ID under Developer App, then **Trust**.
    - When the app asks to find devices on your local network, tap **Allow**. Without it, the app can't reach the API.
    - Sign in with the test account and finish the Assessment, so Today has a plan.

### Build and install: Android

12. **Plug in the phone.** From `apps/mobile`, generate `android/` once. It asks for a package name, as `app.json` has none: enter `com.asjscott.mobile`.

    ```bash
    npx expo prebuild --platform android
    ```

13. **Let the app use plain `http`.** A Release build on Android refuses `http://` by default, so the app couldn't reach the API on the Mac. This allows it in the generated manifest, which is gitignored, and does nothing if it's already allowed:

    ```bash
    grep -q usesCleartextTraffic android/app/src/main/AndroidManifest.xml || sed -i '' 's/<application /<application android:usesCleartextTraffic="true" /' android/app/src/main/AndroidManifest.xml
    ```

    Do it again whenever `android/` is removed and generated again.

14. **Build and install:**

    ```bash
    EXPO_PUBLIC_API_URL="http://$(ipconfig getifaddr en0):3000" npx expo run:android --variant release --device
    ```

    - Pick the phone from the list, not the emulator.
    - If the Mac's IP address changes (a new Wi-Fi network, or the next day), step 9's `/health` stops loading. Build again.
    - Then open the app, sign in with the test account and finish the Assessment.

### Airplane mode

- **iPhone:** iOS turns Wi-Fi back on in airplane mode if you've done that before. Check in Control Center that Wi-Fi and Bluetooth are both off, or the "offline" checks aren't offline.
- **Android:** check in Quick Settings that Wi-Fi is off too.
- **A USB cable** to the Mac doesn't carry the app's traffic, so it can stay plugged in.
- **To force-quit:**
  - iPhone: swipe up from the bottom, pause, then swipe the app's card away.
  - Android: open Recents and swipe the app away.

### Afterwards

- The bundle identifier and package name these builds wrote into `app.json` aren't for committing. Undo them, from `apps/mobile`, once you're done building for the phones:

  ```bash
  git checkout app.json
  ```

- With a free Apple ID, the iPhone app stops opening after 7 days. Run step 10 again to reinstall.

### Tooling: driving the simulators

- **iOS:** Claude Code's iOS Simulator tool taps, types and takes screenshots, and typing works there. Plain `xcrun simctl` gives screenshots, `openurl` and `ui … appearance` only. Expo Go's gear sits on the header ⋯: drag it out of the way.
- **Android:** `adb` (in `~/Library/Android/sdk/platform-tools`, not on `PATH`) works for taps, typing, screenshots and `uiautomator dump`. The Clerk custom tab's contents aren't in the uiautomator tree, but `adb forward tcp:9222 localabstract:chrome_devtools_remote` exposes the page over the Chrome DevTools Protocol.
- **Offline on the emulator:** `adb reverse` carries the app's traffic, so remove it (`adb reverse --remove-all`) and restart the adb server to cut open connections. Airplane mode alone isn't enough.

---

## Timing

- [ ] **P9** The estimated time is honest: run a full Standard Workout with a timer. The 5-minute warm-up is a spec assumption "unless it proves wrong on a phone".
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Needs a full Workout run with a timer. Simulators, not a phone.

## Rest timer (#95)

`expo-keep-awake` is a new native module, so these need a new development or release build. Leave the phone's auto-lock at its usual setting (30 s to 1 min makes T2 quick).

- [x] **T2** Rerun on both phones, on a Release build (`--configuration Release` / `--variant release`, not `pnpm ios`): a development build keeps the whole app awake. Don't watch the screen while you wait. Put the phone face down, or on iPhone turn off Settings › Face ID & Passcode › Attention Aware Features (on Android, Settings › Display › Screen attention). Either setting keeps the screen on while you look at it. Then:
  1. Before starting, leave the phone on Today past its auto-lock time: it locks. If it doesn't, the cause isn't the Workout, so note that and stop.
  2. Start a Workout and leave it on the logging screen, then on Today: the screen stays on.
  3. Finish, then leave it on Today and again on History: it dims and locks.
  4. Start another and Discard it, then leave it on Today: it locks.
  5. In airplane mode, start, log a Set and finish, so the Workout is Pending, then leave it on Today: it locks.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: Passes completely on iPhone

## Daily check-in (#92)

- [ ] **C5** The next day the check-in is gone: the card is back (if there's a plan) and the Workout is full.
  - iOS: Result: 🕒 · Android: Result: 🕒 · Notes: Skip for now: needs the next day.
- [x] **C6** (#125) In airplane mode, check in on Today: the Day's Workout follows the Readiness straight away, as online. Change the check-in once, still offline. Turn airplane mode off and bring the app to the foreground. The `checkIns` collection in the staging database has one document for today, with the changed ratings, not the first.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Android emulator, against the in-memory API, not staging. In airplane mode (with the adb port forward to the API cut), changing the check-in made the Workout lighter at once and the API kept the old ratings. Back online and foregrounded, the one check-in for today had the changed ratings. My first try leaked through an open adb keep-alive connection, so it wasn't really offline; the rerun was. ⚠️ Changing a rating adds or removes rows above the ratings ("Paired into supersets to fit the time", "Lighter after your check-in"), so the buttons move under your finger, and it can leave a blank gap where a row was.
- [x] **C7** (#147) Open the Next Workout sheet on Today with a check-in, on a Length that pairs supersets (see Supersets below). Rate a few times so the Workout gets lighter and full again: the rating buttons don't move under your finger. "Lighter after your check-in", Full workout and "Paired into supersets to fit the time" come and go below the ratings, and no blank gap is left where one was. "Lighter after your check-in" sits below Full workout, and "Paired into supersets to fit the time" below No supersets: tap each chip, and it doesn't move under your finger as its note goes. The line under "Next Workout" stays one line as its counts change.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 3 (simulators, PR #151): Android emulator. After a check-in the ratings sit above everything that changes, and stayed put through every rating on Short, Quick and Bodyweight only. "Lighter after your check-in" sits under Full workout and "Paired into supersets to fit the time" under No supersets (pairs formed on Bodyweight only + Short). Tapping No supersets, then Full workout: each chip stayed where it was as its note went. The line under "Next Workout" stayed one line. iOS not run: same screen code.

## Supersets (#96)

A Workout pairs Exercises only when it wouldn't otherwise fit its Length, so choose Quick or Short on a plan of four or more Exercises. Pairs only form where the Patterns go together (push with pull or hinge, squat with core), never with a one-sided Exercise or a carry, so a plan without such Exercises may need Bodyweight only to swap some in. The sheet then says "Paired into supersets to fit the time" and shows "Superset with …" under each paired Exercise.

- [ ] **S1** P9's timing check on a paired Workout: start one whose sheet shows at least one superset, note its "About N min", and run it in full with a timer, resting as the timer says and skipping nothing. A pair is timed at Sets × (the longer Exercise's Set + 30 s): does the real time come out within a few minutes of the estimate?
  - iOS: Result: ⏭ · Android: Result: ⏭ · Notes: Timing needs a real run. On Standard after a check-in, the sheet said "Paired into supersets to fit the time" and showed bench press "Superset with Nordic hamstring curl" and the reverse.

## Past Workouts (#129)

- [x] **W1** On Today, tap "Log a past workout" under Start manual workout: a sheet asks "Which day was it?" with Yesterday and the five weekdays before it. Pick one: the Workout opens with "Done <that day>" under its title, and no Elapsed timer above its Sets and Volume. Log a Set or two and tap Finish: the times read that day, an hour long, with Edit times already open. Set an end two days after the start: Time reads in hours and minutes ("49 h"), not as a clock. Save: "A Workout can last at most 6 hours" shows under End. Set a start 8 days back and Save: "The start can't be more than 7 days ago" shows under Start. Set it back within the week and Save: in History the Workout sits on its own day, and This Week counts it only if that day is in this week. On the installed web app, check that the date and time inputs are easy to use on the iPhone.
  - iOS: Result: ⏭ · Android: Result: ⚠️ · Notes: Session 3 (simulators, PR #151): Android emulator. Yesterday, Saturday … Tuesday offered on a Monday. Thursday opened with "Done Thursday, 5:24 PM" and no Elapsed timer. Finish: Thursday, an hour, Edit times open. End two days on: Time "49 h", Save: "A Workout can last at most 6 hours" under End. Start 8 days back: "The start can't be more than 7 days ago" under Start. Saved within the week: under Last week on Thursday, This week stayed at 1. ⚠️ Logging a Set on the past Workout still starts the rest timer ("Rest 1:29"), which means nothing after the fact. The web app's date inputs not tried.

## Sentry (#122)

On hold: these were written for a staging deploy, which isn't being built. They need rewording to check production once M6 reaches `main`. Until then, they need Sentry set up and staging deployed with its variables: see "Error reporting" in `docs/agents/workouts.md`. Run these on the installed web app on the iPhone, against staging, signed in with a test account.

- [ ] **E1** The web app: open `/debug-error` on the staging web app (type it after the address in Safari). Within a minute, Sentry has "Test error from the web app (/debug-error)" under the staging environment, with a stack trace and your Clerk user id (`user_…`) as the user, and no email, IP address or headers.
  - iPhone: Result: ⏭ · Notes: Needs staging and Sentry.
- [ ] **E2** The API: the same page also asks the staging API to throw, and says "the API answered: … Test error from the API". Sentry has "Test error from the API (GET /debug/error)" under staging, with a stack trace, the transaction `GET /debug/error` and your Clerk user id, and no headers, body or query string.
  - iPhone: Result: ⏭ · Notes: Needs staging and Sentry.
- [ ] **E3** Production stays apart: an error on staging never shows under production, and the local app (no DSN) sends nothing.
  - Result: ⏭ · Notes: Needs staging and Sentry.

## Over time

🕒 Skip for now: these need real weeks of training. Run them once you're training on the app.

- [ ] **P16** A new week: open the app on Monday. The plan is built for the new week, with nothing carried over. The walk couldn't show this, as it can't move the server's clock, so wait for a real Monday.
  - iOS: Result: 🕒 · Android: Result: 🕒 · Notes: Skip for now: needs a real Monday.
- [ ] **P17** Week after week, do the same Exercises carry on, and do Previous Sets stay useful?
  - iOS: Result: 🕒 · Android: Result: 🕒 · Notes: Skip for now: needs weeks of training.

## Recovery Workout (#97)

Needs `pnpm --filter @fit/api seed:exercises` run once from the main checkout (it needs `apps/api/.env`), so the Exercises tab lists the five Recovery Exercises.

- [x] **R1** On a Rest Day, the "Rest today." card has a "Recovery workout instead" link. Tap it: a Workout opens with a 20-minute walk, then hip flexor stretch, open book, cat-cow and world's greatest stretch at 2 × 45 s each, logged on the normal timed-Set screen. The walk's target reads "1 set · 20 min". Log it: no rest timer starts, and in place of a Set 2 there's "Next exercise", which opens the hip flexor stretch. A stretch's Set still starts its usual rest (1:10), and still offers a Set 3 after its 2.
  - iOS: Result: ⚠️ · Android: Result: ⚠️ · Notes: Started from "Recovery workout instead" in a training day's sheet, not a Rest Day card, so the "Rest today." card wasn't seen. Walk "1 set · 20 min", then hip flexor stretch, open book, cat-cow and world's greatest stretch at 2 × 45 s. Logging the walk: no rest timer, "Next exercise" opened the hip flexor stretch. Stretch Set: rest 1:10, and Set 3 offered after 2. ⚠️ The walk's stepper reads "1200 s", not minutes (the logged Set reads "20 min"). On a physical phone this was the same as android simulator test
- [x] **R2** The walk's stepper reads in minutes (#145). Start a Recovery Workout: the walk's stepper reads "20 min", as its target and the logged Set do. Tap + : "21 min"; − twice: "19 min". Tap into the field: it shows "1140 s" while you type; type 900 and tap away: "15 min". On a stretch, the stepper reads "45 s" and steps by 5 s; from "55 s", + reads "1 min" and − from there "55 s".
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 3 (simulators, PR #151): Android emulator. Walk "20 min"; + "21 min"; − twice "19 min". In the field it showed "1140 s", selected; typed 900: "15 min". The logged Set read "15 min". Hip flexor stretch "45 s", up by 5 s to "55 s", then + "1 min" and − "55 s".

## Jumps (#105)

Needs `pnpm --filter @fit/api seed:exercises` run once from the main checkout (it needs `apps/api/.env`), so the Exercises tab lists the six jumps. Use an athletic profile with no knee or ankle injury, whose Assessment tested the squat rather than estimating it.

- [x] **J1** Profile shows an "Include jumps" switch under Training, off, and only while the Goal is athletic. Turn it on, then open Today: the plan's sheet opens with two jumps, each "3 sets · N contacts" (for example "3 sets · 10 contacts"), one that goes up (pogo hop, squat or countermovement jump, box jump) and one that goes forward or sideways (broad jump or lateral bound). Start the Workout: the jumps come first, and a jump still to come reads "3 sets · N contacts" in the list of Exercises. Log a jump Set: the stepper says "contacts", with no weight field, the logged Set reads "N contacts", and it uploads. The Workout's detail in History and Today's Last workout also say "contacts" for it (#141). Turn the switch off: Today's plan has no jumps. Turning it back on, or a knee injury in the profile, also works as expected.
  - iOS: Result: ✅ · Android: Result: ✅ · Notes: Session 3 (simulators, PR #151): Pogo hop "3 sets · 10 contacts" and Broad jump "3 sets · 6 contacts" in the sheet and, still to come, in the Workout's list. The logged Set read "10 contacts" on both. Android: the Workout's detail in History and Today's Last workout said "Pogo hop · 10 contacts". Switch off and the knee injury not rerun.
- [ ] **J2** Over a week with the switch on: the first 2 Workouts have jumps and the rest don't, and the second jump Workout has different jumps from the first. On a Quick Workout the jumps stay, all 3 Sets each, and something else is cut.
  - iOS: Result: 🕒 · Android: Result: 🕒 · Notes: Skip for now: needs a week. Seen on the simulators: after one jump Workout, a 4th (extra) Workout that week planned one jump, Squat jump, different from the Pogo hop.

## Units (#126)

- [x] **U1** An existing account shows every load in lb with nothing chosen: Profile's "Weights in" has lb picked, and Today's plan, the logging screen (target, Last, Sets, stepper), History, a Workout's detail, Volume everywhere and the Equipment Profile's weights all read in lb. Log a Set of 25 lb: it reads 25 lb in the Set row, History and as Last next time, never 24.9. Pick kg on Profile: the same screens switch to kg, and the 25 lb Set reads 11.5 kg. With the loads unknown (a home profile with dumbbells but no weights entered), the load stepper moves by 5 lb or 2 kg.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: lb picked with nothing chosen. Plan, logging (target, Last, Sets, stepper), History, the detail and Volume all read lb. 25 lb Set read 25 lb in the row, History and as Last; after picking kg, 11.5 kg. Equipment profile reads in lbs. Profile still shows body weight as "80 kg" with lb picked.
- [x] **U2** Body weight follows "Weights in" (#148). With lb picked, Profile shows an 80 kg body weight as "176.4 lb". Edit profile: "About you" asks "Weight (lb)", filled with 176.4. Save without touching it: Profile still reads 176.4 lb, and 80 kg once kg is picked. Edit again in lb, enter 180 and save: Profile reads 180 lb, never 179.9. Pick kg: it reads 81.6 kg, and Edit profile asks "Weight (kg)". A new account's onboarding asks "Weight (lb)".
  - iOS: Result: ✅ · Android: Result: ⚠️ · Notes: Session 3 (simulators, PR #151): iOS: Profile "176.4 lb"; Edit profile asked "Weight (lb)" with 176.4; 180 saved as exactly 180 lb (81.6466 kg through the API). Not seen on iOS: the kg view and onboarding. Android: "176.4 lb"; saved unchanged, stayed exactly 80 kg; with kg, "80 kg" and "Weight (kg)". ⚠️ Typing 180 on Android failed: emptying the weight field put 176.4 back, with "Enter your weight" under it. Probably the emulator's injected key events (the height field misbehaved the same way), but try clearing the field by hand once. Onboarding not tried.

## Load Steps (#127)

- [x] **LS1** On a gym profile in lb, Today's dumbbell targets are 5 lb steps (25, 30, 35 lb), barbell ones are 45 lb plus pound plates (135, 140 lb) and cable ones are 10 lb steps. On the logging screen the stepper moves 25 → 30 lb on dumbbells, 135 → 140 lb on a barbell and 100 → 110 lb on a cable. An Exercise that takes dumbbells or kettlebells, such as Renegade row, is planned on a dumbbell (a 5 lb step, never a 17.5 lb kettlebell) and steps 25 → 30 lb on dumbbells, never to a 26.5 lb kettlebell; typed at 26.5 lb, it steps 26.5 → 35.5 lb through the kettlebells. Recheck for #149 and #155 (a fresh Assessment, or a profile added since: a Working Level stored on a kettlebell stays there). Switch to kg on Profile: the targets become 2.5 kg dumbbells, a 20 kg bar and 5 kg cable steps.
  - iOS: Result: ❌ · Android: Result: ❌ · Notes: Session 3 (simulators, PR #151): Renegade row is planned at "17.5 lb × 8 per side" on both: an 8 kg kettlebell, not a dumbbell. On Android its stepper went 17.5 → 26.5 → 35.5 → 44 lb, all kettlebells, and no lower than 17.5, so it never reaches the dumbbell steps. The API shows its Working Level as 8 kg, set by the Assessment: seeding picks the heaviest load across both kinds, while #149 keeps the stepper on the kind the load is on. Single-arm kettlebell swing stepped 26.5 → 35.5 → 44 lb, kettlebells only, as expected. Barbell and cable steps not rechecked.

- [x] **LS2** Edit the gym profile (Profile → Training): a stage asks only for "Cable and machine step (lb)", filled with 10. Change it to 15 and save: Today's cable targets and the cable stepper now move in 15 lb steps. On a home profile with a cable machine selected, the same field shows on the weights stage next to the other equipment.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: Edit profile's weights stage asked only "Cable and machine step (lb)", filled with 10. 15 saved: Today's cable target became 45 lb and the stepper moved 40 → 45 → 60. Not tried: the home-profile variant.

## PRs (#130)

On the phone builds against the API on your Mac (the installed PWA later), once an Exercise has a Workout behind it (the first Workout on an Exercise is only a baseline). The web build walked both checks with the in-memory API; these are for the phone.

- [x] **PR1** With signal, beat an Exercise's best (more kg at the same reps, or more reps) and Save workout. The toast reads "Workout saved. New PR: …" with "See workout", which opens the Workout in History showing "New PR · …" under that Exercise. Today shows no PR note for it.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 3 (simulators, PR #151): Android emulator. Bench 135 lb × 6, 6 after the Assessment's 60 kg × 5: "Workout saved. New PR: Barbell bench press" with See workout, still up at 6 s and gone by 11 s. History row "New PR"; detail "New PR · Estimated max 162 lb, up from 154 lb". No note on Today. See workout not tapped.
- [x] **PR2** In airplane mode, beat a best again and save. Straight away (within 10 seconds), pull down Control Center, turn airplane mode off and go back to the app: once it uploads, Today shows a green note naming the PRs with "See workout", and no "New PR" toast. Close and reopen the app: the note is gone, and the Workout's History row says "New PR". Recheck for #142.
  - iOS: Result: ⏭ · Android: Result: ✅ · Notes: Session 3 (simulators, PR #151): Android emulator, offline by cutting its connection to the API (not airplane mode). Bench 145 lb × 6, 6 saved offline: "Saved on your phone; it will upload when you have signal", Last workout "Waiting to sync". Reconnected, sent the app to the background and back: a green note "New PR: Barbell bench press · Today, 5:29 PM", "Estimated max 174 lb, up from 162 lb", See workout, and no toast. Force-quit and reopened: the note was gone, and the History row said "New PR".

## Double progression (#132)

On the phone builds against the API on your Mac (the installed PWA later), after the Assessment. Route tests cover the rules; these are for the screen.

- [x] **DP1** Do a Workout and log every Set of one weighted Exercise at its target or more, at the prescribed weight. Once it uploads, open the Next Workout sheet on Today: if the Exercise is planned again, its target is 1 rep more and under it reads "One more rep: every Set reached the target." An Exercise whose Set fell short shows its old target and no line.
  - iOS: Result: ✅ · Notes: Native app on simulators. Renegade row at 25 lb × 8 every Set: next sheet "25 lb × 9" with "One more rep: every Set reached the target." The Workout in between was uploaded through the API to get the Exercises planned again. Same lines on Android.
- [x] **DP2** Log 2 or more Sets of a weighted Exercise at a different weight from the one prescribed. Next time it's planned, its target is that weight at the fewest reps you did, with "From the weight you lifted last time."
  - iOS: Result: ✅ · Notes: Bench at 135 lb × 6, 6 (prescribed 125): next sheet "135 lb × 6" with "From the weight you lifted last time." (60 kg once switched to kg).

## Deload week and the retest (#137)

🕒 Skip for now. On the phone builds against the API on your Mac (the installed PWA later), in the 5th week of a Block: the week starting 4 Mondays after the Monday of the week the Assessment's B was done. Route tests cover the rules; these are for the screen.

- [ ] **DL1** In the deload week, open the Next Workout sheet on Today: the Exercises and Sets are as usual, weighted targets about 10% lighter (on a real dumbbell, plate or stack step), and bodyweight, band and timed targets about 70% of last week's (never under 5 reps or 15 s unless they were already). Below the plan, a "Retake the Assessment" section explains that only the Exercises it tests, and any not done this Block, get new levels, with Start assessment A. The wording reads well and doesn't feel pushy.
  - iOS: Result: 🕒 · Notes: Skip for now: needs the 5th week of a Block.
- [ ] **DL2** Dismiss the retest with the ×: it stays gone for the rest of the week. On the Monday after, the plan is back to the usual loads and there's no retest. Or, instead, take A and B in the deload week: the Results open as usual, and next week an Exercise you trained this Block but the Assessment didn't test keeps the target it had reached.
  - iOS: Result: 🕒 · Notes: Skip for now: needs the 5th week of a Block.

## RPE on the last Set (#133)

On the phone builds against the API on your Mac (the installed PWA later), after the Assessment. Route tests cover the hold; the web build walked the chips with the in-memory API; these are for the phone.

- [x] **RPE1** Start the Next Workout and log a weighted Exercise's Sets. Until its last planned Set, nothing asks for RPE. Once the last is logged, "How hard was set N? Optional: 10 is no more reps" and chips 6–10 show under the Sets, with Log set and the rest timer where they were. Go on to the next Exercise without tapping one: nothing stops you. Back on the first, tap 10: it highlights; tap it again and it clears. In a Manual Workout the chips show after every Set, for the latest. Editing a rated Set keeps its RPE.
  - iOS: Result: ✅ · Notes: Native app on the iOS simulator. No chips until the last planned Set, then "How hard was set 3? Optional: 10 is no more reps" with 6–10. Moving on without rating was fine. 10 highlighted, and tapping again cleared it (tried on a later Exercise, not the first). Editing the rated Set kept its RPE. Shows on a manual workout after every set as expected.
- [x] **RPE2** Rate the last Set of a weighted Exercise 10 where every Set reached its target, and save. Once it uploads, the Next Workout sheet (if it plans the Exercise again) keeps the same weight and target, with "Held: your last Set was RPE 10, all you had." under it.
  - iOS: Result: ✅ · Notes: Lateral raise, every Set at target, last rated 10: next sheet kept 10 lb × 8 with "Held: your last Set was RPE 10, all you had." Same on Android.

## Library gaps (#101)

Needs `pnpm --filter @fit/api seed:exercises` run once from the main checkout (it needs `apps/api/.env`), so the Exercises tab lists the six new Exercises.

- [x] **L1** The Exercises tab lists Calf raise, Nordic hamstring curl, Dumbbell curl, Dumbbell overhead triceps extension, Cable knee extension and Table row, each with its cues. Switch Today to Bodyweight only: a back Exercise the plan had (a row or pull-up) offers Table row as its Alternative Exercise, where it used to offer nothing for a lats pull. With a build_muscle or athletic profile, the plan's reasons and Workouts don't break on calves, which are now in the Weekly Budget.
  - iOS: Result: ✅ · Android: Result: ⏭ · Notes: All six are in the library with 3 cues each; Calf raise and Cable knee extension seen in the Exercises tab. Bodyweight only: Table row "Instead of Renegade row". Athletic plans and reasons didn't break.

## Your call

Not a bug, but it needs your judgement once you've done some Workouts. Details in `docs/research/planner-simulation.md`.

- With jumps on, 2 Short days a week lose most of their upper-body work to the jumps' 15 minutes (chest 1 of 12, side delts 0 of 8 in the simulation). Should the switch warn, or jumps give way, at 2 Short days? (2026-11-10, see Jumps.)
- Do Workouts that fill their Length, at up to 214% of a Muscle's budget, feel like too much? Should a Workout stop at the budget? Left until after real use (2026-11-09).

---

## Write-up

Answer these after the run, while it's fresh. Short answers are fine.

1. Would you merge as it is? If not, what's the one thing that blocks it?
   - Claude's simulator run: nothing seen blocks it, but it doesn't replace the phone checks (offline, Release build, real time). Yours to decide.
2. Which checks failed (IDs)? For each: what you did, what you expected, what happened, and whether it happens every time.
   - J1: in a Workout with jumps, the upcoming row reads "Broad jump · 3 sets · 6 reps" and a logged jump Set reads "10 reps", where the sheet and stepper say "contacts". Expected "contacts" throughout. Every time.
3. Which checks did you skip, and why?
   - P9, S1 timing, T2, C5, P16, P17, J2, DL1, DL2: need real time, a Release build or a phone. PR2, E1–E3: need the PWA on staging, and Sentry. Not run on one platform: see each check's line.
4. Anything that broke or looked wrong that no check covers?
   - Deleting a Workout doesn't rebuild the plan: `DELETE /workouts/:id` leaves it as it was. With today's Workouts deleted, Today still said "This week's work is done. This one's extra." and "Legs and Core are recovering from today." at 0 of 3 Workouts. (Deleted through the API, which History's delete also uses.)
   - Check-in in the sheet: rows above the ratings appear and disappear as you rate, so the buttons move under your finger, and a blank gap can be left behind.
5. Any wording on screen that was confusing, too long, or didn't match what the app did? Quote it.
   - "Done Saturday, 10:43 AM" while an Elapsed timer counts up on a past Workout. "49:00 h" for a 49-hour span. The walk's stepper says "1200 s" (logged as "20 min"). "Estimated max 162 lb, up from 154.3 lb" rounds the two differently. Profile shows body weight "80 kg" with lb picked.
6. Did the Exercises, Set counts and targets feel believable for you? Too light, too heavy, or about right?
   - Not judged by a person. Pistol squat at "3 sets · 15 reps per side" looks heavy for most people.
7. Any difference between iOS and Android worth noting?
   - The History label for the Assessment week: iOS "25 Oct – 31 Oct", Android "Oct 26 – Nov 1". The grouping picks the right Monday, so suspect iOS date formatting across the 1 Nov clock change (the iOS simulator was on the Mac's MST, the Android emulator on Pacific). Unconfirmed.

### Handing it back to Claude

Paste this file, filled in, with the prompt below:

> Here are my manual test results for spec #77. For each failed or ⚠️ check, and each problem in the write-up: say whether it's a bug, a spec gap, or working as intended, and draft a GitHub issue (title, steps to reproduce, expected, actual) for the ones that need fixing. Show me the drafts before posting anything.
